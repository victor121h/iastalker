import type { NextRequest } from 'next/server';
import { tx } from '@/lib/studio/db';
import { HttpError, enforceRateLimit, getClientIp, json, normalizeEmail, readJson, route, str } from '@/lib/studio/http';
import { createSession, hashPassword, toPublicUser, validatePassword, type UserRow } from '@/lib/studio/auth';
import { addCredits } from '@/lib/studio/credits';
import { claimPendingPayments } from '@/lib/studio/payments';
import { studioEnv } from '@/lib/studio/env';
import { DEFAULT_LANG, isLang } from '@/lib/studio/i18n/define';
import { HOUR, cleanName, sessionMeta } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NAME_MAX = 80;

/** POST /api/studio/auth/signup {name,email,password,acceptTerms,lang} → 201 {user} */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req, 16 * 1024);

  const name = cleanName(str(body.name, 'name', { min: 1, max: NAME_MAX }));
  if (!name) throw new HttpError(400, 'invalid_input', 'name is required', { field: 'name' });
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  if (body.acceptTerms !== true) {
    throw new HttpError(400, 'terms_required', 'You must accept the terms to continue', { field: 'acceptTerms' });
  }
  const lang = isLang(body.lang) ? body.lang : DEFAULT_LANG;

  // Counted after validation so typos don't burn the quota; still caps account creation per IP.
  enforceRateLimit(`studio:signup:ip:${getClientIp(req)}`, 10, HOUR);

  const passwordHash = await hashPassword(password);
  const bonus = studioEnv.signupBonus();

  const user = await tx(async (c) => {
    const inserted = await c.query<{ id: string }>(
      `INSERT INTO studio_users (email, name, password_hash, lang, terms_accepted_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, name, passwordHash, lang],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new HttpError(409, 'email_taken', 'An account with this email already exists', { field: 'email' });
    }
    const userId = String(id);

    if (bonus > 0) await addCredits(c, userId, bonus, 'signup_bonus');
    await claimPendingPayments(c, userId, email);
    await createSession(userId, sessionMeta(req), c);

    const { rows } = await c.query<UserRow>('SELECT * FROM studio_users WHERE id = $1', [userId]);
    return rows[0];
  });

  return json({ user: toPublicUser(user) }, { status: 201 });
});
