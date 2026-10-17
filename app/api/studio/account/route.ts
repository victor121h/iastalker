import type { NextRequest } from 'next/server';
import { query } from '@/lib/studio/db';
import { HttpError, enforceRateLimit, json, readJson, route, str } from '@/lib/studio/http';
import { requireUserRow, toPublicUser, type UserRow } from '@/lib/studio/auth';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/studio/i18n/define';
import type { PaymentDTO } from '@/lib/studio/types';
import { ACCOUNT_HISTORY_LIMIT, ACCOUNT_NAME_MAX, cleanDisplayName } from '@/components/studio/account/constants';
import {
  MINUTE,
  VISIBLE_PAYMENT_STATUSES,
  ledgerToDTO,
  paymentToAccountDTO,
  type AccountPaymentRow,
  type LedgerRow,
} from './_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Pending checkouts older than this are abandoned (Stripe sessions expire after 24h). */
const PENDING_VISIBLE_DAYS = 7;
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * GET /api/studio/account → {user, ledger, payments}
 * The session user with their last 50 ledger entries and last 50 purchases (paid / refunded /
 * recent pending), newest first.
 */
export const GET = route(async () => {
  const row = await requireUserRow();

  const [ledger, payments] = await Promise.all([
    query<LedgerRow>(
      `SELECT id, delta, balance_after, reason, ref_type, ref_id, created_at
         FROM studio_credit_ledger
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2`,
      [row.id, ACCOUNT_HISTORY_LIMIT],
    ),
    query<AccountPaymentRow>(
      `SELECT id, provider, plan_id, credits, amount_cents, currency, status, created_at
         FROM studio_payments
        WHERE user_id = $1
          AND status = ANY($2::text[])
          AND (status <> 'pending' OR created_at > NOW() - make_interval(days => $3))
        ORDER BY created_at DESC, id DESC
        LIMIT $4`,
      [row.id, VISIBLE_PAYMENT_STATUSES, PENDING_VISIBLE_DAYS, ACCOUNT_HISTORY_LIMIT],
    ),
  ]);

  const paymentDTOs: PaymentDTO[] = [];
  for (const p of payments.rows) {
    const dto = paymentToAccountDTO(p);
    if (dto) paymentDTOs.push(dto);
  }

  return json({
    user: toPublicUser(row),
    ledger: ledger.rows.map(ledgerToDTO),
    payments: paymentDTOs,
  });
});

/**
 * PATCH /api/studio/account {name?, lang?} → {user}
 * Updates the display name (1..80 chars, trimmed) and/or the preferred language. Changing the
 * language also refreshes the studio_lang cookie so logged-out pages follow the preference.
 */
export const PATCH = route(async (req: NextRequest) => {
  const current = await requireUserRow();
  const body = await readJson(req, 4 * 1024);
  enforceRateLimit(`studio:account:update:user:${current.id}`, 30, MINUTE);

  let name: string | null = null;
  if (body.name !== undefined) {
    name = cleanDisplayName(str(body.name, 'name', { min: 1, max: ACCOUNT_NAME_MAX }));
    if (!name) throw new HttpError(400, 'invalid_input', 'name is required', { field: 'name' });
  }

  let lang: Lang | null = null;
  if (body.lang !== undefined) {
    if (!isLang(body.lang)) throw new HttpError(400, 'invalid_input', 'Unsupported language', { field: 'lang' });
    lang = body.lang;
  }

  if (name === null && lang === null) {
    throw new HttpError(400, 'invalid_input', 'Nothing to update');
  }

  const { rows } = await query<UserRow>(
    `UPDATE studio_users
        SET name = COALESCE($2, name),
            lang = COALESCE($3, lang),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [current.id, name, lang],
  );
  const updated = rows[0];
  if (!updated) throw new HttpError(401, 'unauthorized', 'Please log in to continue');

  const res = json({ user: toPublicUser(updated) });
  if (lang !== null) {
    // Same attributes as the client-side cookie written by LanguageProvider.setLang (readable by JS).
    res.cookies.set(LANG_COOKIE, lang, {
      path: '/',
      maxAge: LANG_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: false,
    });
  }
  return res;
});
