import type { NextRequest } from 'next/server';
import { query } from '@/lib/studio/db';
import { HttpError, enforceRateLimit, getClientIp, json, normalizeEmail, readJson, route } from '@/lib/studio/http';
import {
  PASSWORD_MAX,
  createSession,
  getDummyHash,
  toPublicUser,
  verifyPassword,
  type UserRow,
} from '@/lib/studio/auth';
import { MINUTE, sessionMeta } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Warm the dummy hash so the first unknown-email login isn't measurably slower.
getDummyHash().catch(() => {});

async function safeVerify(password: string, stored: string): Promise<boolean> {
  try {
    return await verifyPassword(password, stored);
  } catch {
    return false;
  }
}

/** POST /api/studio/auth/login {email,password} → {user} */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req, 16 * 1024);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) throw new HttpError(400, 'invalid_input', 'password is required', { field: 'password' });

  const ip = getClientIp(req);
  enforceRateLimit(`studio:login:ip:${ip}`, 40, 15 * MINUTE);
  enforceRateLimit(`studio:login:ip-email:${ip}:${email}`, 10, 15 * MINUTE);
  // Account-wide ceiling: still caps password guessing on one account if the client IP is spoofed.
  enforceRateLimit(`studio:login:email:${email}`, 50, 15 * MINUTE);

  const { rows } = await query<UserRow>('SELECT * FROM studio_users WHERE email = $1', [email]);
  const row = rows[0];

  // Always run scrypt (against a dummy hash for unknown emails) so timing doesn't reveal accounts.
  const stored = row ? row.password_hash : await getDummyHash();
  const candidate = password.length <= PASSWORD_MAX ? password : '';
  const matches = await safeVerify(candidate, stored);
  if (!row || !candidate || !matches) {
    throw new HttpError(401, 'invalid_credentials', 'Wrong email or password');
  }

  await createSession(String(row.id), sessionMeta(req));
  return json({ user: toPublicUser(row) });
});
