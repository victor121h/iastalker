import type { NextRequest } from 'next/server';
import { tx } from '@/lib/studio/db';
import { HttpError, enforceRateLimit, getClientIp, json, readJson, route } from '@/lib/studio/http';
import {
  SESSION_COOKIE,
  hashPassword,
  requireUserRow,
  sha256,
  validatePassword,
  verifyPassword,
} from '@/lib/studio/auth';
import { PASSWORD_MAX_LENGTH } from '@/components/studio/account/constants';
import { MINUTE } from '../_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/studio/account/password {currentPassword, newPassword} → {ok:true}
 * Verifies the current password, stores the new hash, signs out every OTHER session of the user
 * (the current browser stays logged in) and invalidates outstanding password-reset links.
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUserRow();
  const body = await readJson(req, 8 * 1024);

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  if (!currentPassword) {
    throw new HttpError(400, 'invalid_input', 'currentPassword is required', { field: 'currentPassword' });
  }
  const newPassword = validatePassword(body.newPassword);

  // Brute-force guard on the current-password check: per account and per IP.
  enforceRateLimit(`studio:account:password:user:${user.id}`, 5, 15 * MINUTE);
  enforceRateLimit(`studio:account:password:ip:${getClientIp(req)}`, 20, 15 * MINUTE);

  // A password longer than the max can never have been set, so skip the (slow) hash for it.
  const valid = currentPassword.length <= PASSWORD_MAX_LENGTH && (await verifyPassword(currentPassword, user.password_hash));
  if (!valid) {
    throw new HttpError(401, 'invalid_credentials', 'Current password is incorrect', { field: 'currentPassword' });
  }

  const passwordHash = await hashPassword(newPassword);
  const token = req.cookies.get(SESSION_COOKIE)?.value || '';
  const currentSessionId = sha256(token);

  await tx(async (c) => {
    // Guard against a concurrent change: only update if the hash we verified is still current.
    const updated = await c.query(
      `UPDATE studio_users SET password_hash = $3, updated_at = NOW()
        WHERE id = $1 AND password_hash = $2`,
      [user.id, user.password_hash, passwordHash],
    );
    if (!updated.rowCount) {
      throw new HttpError(401, 'invalid_credentials', 'Your password was changed elsewhere. Please try again.', {
        field: 'currentPassword',
      });
    }
    await c.query('DELETE FROM studio_sessions WHERE user_id = $1 AND id <> $2', [user.id, currentSessionId]);
    await c.query('DELETE FROM studio_password_resets WHERE user_id = $1 AND used_at IS NULL', [user.id]);
  });

  return json({ ok: true as const });
});
