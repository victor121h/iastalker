import type { NextRequest } from 'next/server';
import { query, tx } from '@/lib/studio/db';
import { HttpError, enforceRateLimit, getClientIp, json, readJson, route } from '@/lib/studio/http';
import {
  createSession,
  destroyAllSessions,
  hashPassword,
  sha256,
  toPublicUser,
  validatePassword,
  type UserRow,
} from '@/lib/studio/auth';
import { MINUTE, RESET_TOKEN_RE, sessionMeta } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function invalidToken() {
  return new HttpError(400, 'invalid_token', 'This link is invalid or has expired');
}

/**
 * POST /api/studio/auth/reset {token,password} → {user}
 * Sets the new password, signs out every other session and logs this browser in.
 */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req, 8 * 1024);
  enforceRateLimit(`studio:reset:ip:${getClientIp(req)}`, 20, 15 * MINUTE);

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!RESET_TOKEN_RE.test(token)) throw invalidToken();
  const tokenHash = sha256(token);

  // Cheap pre-check so an expired link fails fast, before the (slow) password hashing.
  const pending = await query(
    `SELECT 1 FROM studio_password_resets
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  );
  if (!pending.rowCount) throw invalidToken();

  const password = validatePassword(body.password);
  const passwordHash = await hashPassword(password);

  const user = await tx(async (c) => {
    // Atomically consume the token (a concurrent request with the same token gets nothing back).
    const consumed = await c.query<{ user_id: string }>(
      `UPDATE studio_password_resets SET used_at = NOW()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
        RETURNING user_id`,
      [tokenHash],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) throw invalidToken();

    const updated = await c.query<UserRow>(
      `UPDATE studio_users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId, passwordHash],
    );
    const row = updated.rows[0];
    if (!row) throw invalidToken();

    // Any other outstanding links for this account stop working as well.
    await c.query('DELETE FROM studio_password_resets WHERE user_id = $1 AND token_hash <> $2', [userId, tokenHash]);
    await destroyAllSessions(String(userId), c);
    await createSession(String(userId), sessionMeta(req), c);
    return row;
  });

  return json({ user: toPublicUser(user) });
});
