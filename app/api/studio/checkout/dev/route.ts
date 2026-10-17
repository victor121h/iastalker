import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { requireUserRow } from '@/lib/studio/auth';
import { tx } from '@/lib/studio/db';
import { studioEnv } from '@/lib/studio/env';
import { HttpError, enforceRateLimit, json, readJson, route } from '@/lib/studio/http';
import { fulfillPayment, paymentToDTO, type PaymentRow } from '@/lib/studio/payments';
import { getPlan, isPlanId } from '@/lib/studio/plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/studio/checkout/dev {planId} → {ok, balance, payment}
 * Simulated purchase (no money moves). Only exists when STUDIO_DEV_PURCHASES is on
 * (default: on outside production).
 */
export const POST = route(async (req: NextRequest) => {
  if (!studioEnv.devPurchasesEnabled()) throw new HttpError(404, 'not_found', 'Not found');
  const user = await requireUserRow();
  const body = await readJson(req, 4 * 1024);
  const planId = body.planId;
  if (!isPlanId(planId)) throw new HttpError(400, 'invalid_input', 'Unknown plan', { field: 'planId' });
  enforceRateLimit(`studio:checkout-dev:user:${user.id}`, 30, WINDOW_MS);

  const plan = getPlan(planId);
  const userId = String(user.id);
  const result = await tx(async (c) => {
    const { rows } = await c.query<PaymentRow>(
      `INSERT INTO studio_payments (provider, external_id, user_id, email, plan_id, credits, amount_cents, currency, status, raw)
       VALUES ('dev', $1, $2, $3, $4, $5, $6, 'usd', 'paid', $7::jsonb)
       RETURNING *`,
      [
        crypto.randomUUID(),
        userId,
        user.email,
        plan.id,
        plan.credits,
        plan.priceCents,
        JSON.stringify({ simulated: true }),
      ],
    );
    const fulfilled = await fulfillPayment(c, String(rows[0].id));
    if (!fulfilled) throw new Error(`Simulated payment ${rows[0].id} could not be fulfilled`);
    const fresh = await c.query<PaymentRow>('SELECT * FROM studio_payments WHERE id = $1', [rows[0].id]);
    return { balance: fulfilled.balance, payment: paymentToDTO(fresh.rows[0]) };
  });

  return json({ ok: true as const, balance: result.balance, payment: result.payment });
});
