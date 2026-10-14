// Server-only authentication core: password hashing (scrypt), DB-backed sessions in an
// httpOnly cookie, and helpers to resolve the current user in route handlers / server components.
import crypto from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import type { PoolClient } from 'pg';
import { ensureSchema, query } from './db';
import { HttpError } from './http';
import type { PublicUser } from './types';
import type { Tier } from './plans';
import { isLang } from './i18n/define';

const scrypt = promisify(crypto.scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'studio_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions with less than this left get their expiry pushed forward on use. */
const SESSION_REFRESH_MS = 15 * 24 * 60 * 60 * 1000;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

// ── Passwords ────────────────────────────────────────────────────────────────────────────────
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

/** A precomputed hash used to keep login timing constant when the email does not exist. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(12).toString('hex'));
  return dummyHash;
}

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    throw new HttpError(400, 'weak_password', `Password must have at least ${PASSWORD_MIN} characters`, {
      field: 'password',
    });
  }
  if (password.length > PASSWORD_MAX) {
    throw new HttpError(400, 'invalid_input', 'Password is too long', { field: 'password' });
  }
  return password;
}

// ── Tokens ───────────────────────────────────────────────────────────────────────────────────
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ── Users ────────────────────────────────────────────────────────────────────────────────────
export interface UserRow {
  id: string; // BIGSERIAL comes back from pg as a string
  email: string;
  name: string;
  password_hash: string;
  credits: number;
  tier: string;
  lang: string;
  terms_accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    credits: Number(row.credits),
    tier: (['free', 'basic', 'pro', 'vip'].includes(row.tier) ? row.tier : 'free') as Tier,
    lang: isLang(row.lang) ? row.lang : 'en',
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────────────────────────
function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  };
}

/**
 * Creates a session row and sets the cookie. Only callable from route handlers / server actions
 * (Next.js forbids setting cookies while rendering server components).
 */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
  client?: PoolClient,
): Promise<void> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  const sql = `INSERT INTO studio_sessions (id, user_id, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5)`;
  const params = [sha256(token), userId, expires, meta.userAgent?.slice(0, 300) || null, meta.ip || null];
  if (client) await client.query(sql, params);
  else await query(sql, params);
  cookies().set(SESSION_COOKIE, token, cookieOptions(expires));
}

/** Deletes the current session (if any) and clears the cookie. */
export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM studio_sessions WHERE id = $1', [sha256(token)]);
  cookies().set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/** Removes every session of a user (e.g. after a password reset), optionally keeping one. */
export async function destroyAllSessions(userId: string, client?: PoolClient): Promise<void> {
  const sql = 'DELETE FROM studio_sessions WHERE user_id = $1';
  if (client) await client.query(sql, [userId]);
  else await query(sql, [userId]);
}

/**
 * Resolves the logged-in user's full row from the session cookie, or null.
 * Works in route handlers and server components (read-only there).
 */
export async function getSessionUserRow(): Promise<UserRow | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const id = sha256(token);
  const { rows } = await query<UserRow & { session_expires_at: Date }>(
    `SELECT u.*, s.expires_at AS session_expires_at
       FROM studio_sessions s JOIN studio_users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > NOW()`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.session_expires_at).getTime() - Date.now() < SESSION_REFRESH_MS) {
    // Sliding expiry for the DB row; the cookie is refreshed on the next login/route that sets it.
    query('UPDATE studio_sessions SET expires_at = $2 WHERE id = $1', [id, new Date(Date.now() + SESSION_TTL_MS)]).catch(
      () => {},
    );
  }
  return row;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const row = await getSessionUserRow();
  return row ? toPublicUser(row) : null;
}

/** For API routes: returns the user row or throws a 401 HttpError. */
export async function requireUserRow(): Promise<UserRow> {
  const row = await getSessionUserRow();
  if (!row) throw new HttpError(401, 'unauthorized', 'Please log in to continue');
  return row;
}
