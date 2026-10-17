// Server-only payments module: credit-pack fulfilment, Stripe / PerfectPay bookkeeping and the
// sign-up claim of purchases made before the account existed.
//
// Invariants:
//   - a studio_payments row is credited at most once: fulfillPayment() flips `credited_at` with a
//     guarded UPDATE (credited_at IS NULL) in the same transaction that adds the credits, so
//     webhook retries, the success-page sync and sign-up claims can all race safely.
//   - failed / refunded rows are never credited.
//   - refunds never touch credits automatically (they are logged for manual review).
import type { PoolClient } from 'pg';
import { query, tx } from './db';
import { addCredits, bumpTier } from './credits';
import { studioEnv } from './env';
import { getPlan, isPlanId, type PlanId } from './plans';
import type { PaymentDTO, PaymentProvider, PaymentStatus } from './types';
import { idOf, retrieveCheckoutSession, sessionEmail, type StripeCharge, type StripeCheckoutSession } from './stripe';

// ── Rows & DTOs ──────────────────────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: string; // BIGSERIAL → string
  provider: string;
  external_id: string;
  user_id: string | null;
  email: string | null;
  plan_id: string;
  credits: number;
  amount_cents: number;
  currency: string;
  status: string;
  credited_at: Date | null;
  raw: unknown;
  created_at: Date;
  updated_at: Date;
}

const PROVIDERS: PaymentProvider[] = ['stripe', 'perfectpay', 'dev'];
const STATUSES: PaymentStatus[] = ['pending', 'paid', 'refunded', 'failed'];

export function paymentToDTO(row: PaymentRow): PaymentDTO {
  return {
    id: String(row.id),
    provider: (PROVIDERS as string[]).includes(row.provider) ? (row.provider as PaymentProvider) : 'dev',
    planId: isPlanId(row.plan_id) ? row.plan_id : 'basic',
    credits: Number(row.credits),
    amountCents: Number(row.amount_cents),
    currency: (row.currency || 'usd').toLowerCase(),
    status: (STATUSES as string[]).includes(row.status) ? (row.status as PaymentStatus) : 'pending',
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * The user's purchase history for the account page: completed and refunded payments only
 * (abandoned / expired checkouts are bookkeeping noise, not purchases).
 */
export async function listUserPayments(userId: string, limit = 50): Promise<PaymentDTO[]> {
  const { rows } = await query<PaymentRow>(
    `SELECT * FROM studio_payments
      WHERE user_id = $1 AND status IN ('paid', 'refunded')
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [userId, Math.max(1, Math.min(200, Math.floor(limit)))],
  );
  return rows.map(paymentToDTO);
}

// ── Fulfilment ───────────────────────────────────────────────────────────────────────────────

export interface FulfillResult {
  paymentId: string;
  userId: string;
  planId: string;
  credits: number;
  /** The user's balance after the credits were added. */
  balance: number;
}

/**
 * Credits a payment to its user exactly once (idempotent; call inside tx()). Marks the row paid,
 * adds the credits to the ledger and raises the user's tier. Returns null when there is nothing
 * to do: already credited, no user attached yet, or the payment failed / was refunded.
 */
export async function fulfillPayment(c: PoolClient, paymentId: string): Promise<FulfillResult | null> {
  const { rows } = await c.query<{ id: string; user_id: string; plan_id: string; credits: number }>(
    `UPDATE studio_payments
        SET status = 'paid', credited_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND credited_at IS NULL AND user_id IS NOT NULL AND status IN ('pending', 'paid')
      RETURNING id, user_id, plan_id, credits`,
    [paymentId],
  );
  const row = rows[0];
  if (!row) return null;
  const userId = String(row.user_id);
  const credits = Number(row.credits);
  const balance = await addCredits(c, userId, credits, 'purchase', { type: 'payment', id: String(row.id) });
  await bumpTier(c, userId, row.plan_id);
  console.info(`[studio] Payment ${row.id} fulfilled: +${credits} credits for user ${userId} (${row.plan_id})`);
  return { paymentId: String(row.id), userId, planId: row.plan_id, credits, balance };
}

/**
 * Called inside the sign-up transaction: attaches and credits every paid-but-unclaimed purchase
 * made with this email before the account existed (e.g. PerfectPay checkouts). Returns the total
 * credits added.
 */
export async function claimPendingPayments(client: PoolClient, userId: string, email: string): Promise<number> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return 0;
  const { rows } = await client.query<{ id: string }>(
    `UPDATE studio_payments
        SET user_id = $1, updated_at = NOW()
      WHERE email = $2 AND user_id IS NULL AND status = 'paid' AND credited_at IS NULL
      RETURNING id`,
    [userId, normalized],
  );
  // Oldest first so the ledger reads in purchase order.
  const ids = rows.map((r) => String(r.id)).sort((a, b) => Number(a) - Number(b));
  let total = 0;
  for (const id of ids) {
    const result = await fulfillPayment(client, id);
    if (result) total += result.credits;
  }
  if (total > 0) console.info(`[studio] User ${userId} claimed ${ids.length} pending payment(s): +${total} credits`);
  return total;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

async function userIdByEmail(c: PoolClient, email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const { rows } = await c.query<{ id: string }>('SELECT id FROM studio_users WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  return rows[0] ? String(rows[0].id) : null;
}

async function existingUserId(c: PoolClient, candidate: unknown): Promise<string | null> {
  if (typeof candidate !== 'string' || !/^\d{1,18}$/.test(candidate)) return null;
  const { rows } = await c.query<{ id: string }>('SELECT id FROM studio_users WHERE id = $1', [candidate]);
  return rows[0] ? String(rows[0].id) : null;
}

/** Marks a payment refunded (credits are NOT clawed back automatically). */
export async function markPaymentRefunded(
  c: PoolClient,
  provider: PaymentProvider,
  externalId: string,
  note: Record<string, unknown> = {},
): Promise<{ id: string; userId: string | null; credited: boolean } | null> {
  const { rows } = await c.query<{ id: string; user_id: string | null; credited_at: Date | null }>(
    `UPDATE studio_payments
        SET status = 'refunded', raw = COALESCE(raw, '{}'::jsonb) || $3::jsonb, updated_at = NOW()
      WHERE provider = $1 AND external_id = $2
      RETURNING id, user_id, credited_at`,
    [provider, externalId, JSON.stringify({ refund: { ...note, at: new Date().toISOString() } })],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), userId: row.user_id ? String(row.user_id) : null, credited: !!row.credited_at };
}

// ── Stripe ───────────────────────────────────────────────────────────────────────────────────

/** Records the Checkout Session we just created (status 'pending' until the webhook confirms it). */
export async function recordStripeCheckout(input: {
  sessionId: string;
  userId: string;
  email: string;
  planId: PlanId;
  credits: number;
  amountCents: number;
}): Promise<void> {
  await query(
    `INSERT INTO studio_payments (provider, external_id, user_id, email, plan_id, credits, amount_cents, currency, status, raw)
     VALUES ('stripe', $1, $2, $3, $4, $5, $6, 'usd', 'pending', $7::jsonb)
     ON CONFLICT (provider, external_id) DO NOTHING`,
    [
      input.sessionId,
      input.userId,
      input.email.toLowerCase(),
      input.planId,
      input.credits,
      input.amountCents,
      JSON.stringify({ session_id: input.sessionId }),
    ],
  );
}

/** The subset of a Checkout Session worth keeping (no addresses or other buyer details). */
function stripeSessionSummary(session: StripeCheckoutSession, extra: Record<string, unknown> = {}) {
  return {
    session_id: session.id,
    payment_intent: idOf(session.payment_intent),
    payment_status: session.payment_status ?? null,
    session_status: session.status ?? null,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
    customer: idOf(session.customer),
    livemode: session.livemode ?? null,
    ...extra,
  };
}

/**
 * Loads (FOR UPDATE) the payment row of a Checkout Session, creating it from the session's
 * metadata when our own insert never happened. Returns null for sessions that are not Studio
 * credit-pack purchases.
 */
async function lockStripePayment(c: PoolClient, session: StripeCheckoutSession): Promise<PaymentRow | null> {
  const select = () =>
    c.query<PaymentRow>(`SELECT * FROM studio_payments WHERE provider = 'stripe' AND external_id = $1 FOR UPDATE`, [
      session.id,
    ]);
  let row = (await select()).rows[0];
  if (row) return row;

  const planId = session.metadata?.plan_id;
  if (!isPlanId(planId)) return null;
  const email = sessionEmail(session);
  const userId =
    (await existingUserId(c, session.metadata?.user_id)) ??
    (await existingUserId(c, session.client_reference_id)) ??
    (await userIdByEmail(c, email));
  const plan = getPlan(planId);
  await c.query(
    `INSERT INTO studio_payments (provider, external_id, user_id, email, plan_id, credits, amount_cents, currency, status, raw)
     VALUES ('stripe', $1, $2, $3, $4, $5, $6, 'usd', 'pending', $7::jsonb)
     ON CONFLICT (provider, external_id) DO NOTHING`,
    [session.id, userId, email, plan.id, plan.credits, plan.priceCents, JSON.stringify(stripeSessionSummary(session))],
  );
  row = (await select()).rows[0];
  return row ?? null;
}

export type StripeSessionOutcome =
  | { kind: 'credited'; paymentId: string; userId: string; credits: number; balance: number }
  | { kind: 'already_credited'; paymentId: string }
  /** Paid, but no account owns it yet (claimed at sign-up by email). */
  | { kind: 'paid_unassigned'; paymentId: string }
  | { kind: 'rejected'; paymentId: string; reason: 'amount_mismatch' | 'currency_mismatch' }
  | { kind: 'refunded'; paymentId: string }
  | { kind: 'recorded'; paymentId: string }
  | { kind: 'ignored'; reason: string };

/**
 * Handles a Checkout Session whose payment succeeded (checkout.session.completed with
 * payment_status 'paid', checkout.session.async_payment_succeeded, or the success-page sync).
 * Verifies the amount and currency against what we asked for, then fulfils. Call inside tx().
 */
export async function applyPaidStripeSession(
  c: PoolClient,
  session: StripeCheckoutSession,
  context: { via: 'webhook' | 'success_page'; eventId?: string },
): Promise<StripeSessionOutcome> {
  const row = await lockStripePayment(c, session);
  if (!row) return { kind: 'ignored', reason: 'not_a_studio_session' };
  const paymentId = String(row.id);
  if (row.credited_at) return { kind: 'already_credited', paymentId };
  if (row.status === 'refunded') {
    console.warn(`[studio] Stripe session ${session.id} reported paid but payment ${paymentId} is refunded; skipping`);
    return { kind: 'refunded', paymentId };
  }

  const summary = stripeSessionSummary(session, { via: context.via, event_id: context.eventId ?? null });
  // The row's amount is what *we* priced the session at (= plan.priceCents at creation time).
  const expectedCents = Number(row.amount_cents);
  const currency = (session.currency || '').toLowerCase();
  const mismatch: 'amount_mismatch' | 'currency_mismatch' | null =
    currency !== 'usd' ? 'currency_mismatch' : session.amount_total !== expectedCents ? 'amount_mismatch' : null;
  if (mismatch) {
    await c.query(
      `UPDATE studio_payments
          SET status = 'failed', raw = COALESCE(raw, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
        WHERE id = $1 AND credited_at IS NULL`,
      [paymentId, JSON.stringify({ ...summary, rejected: mismatch })],
    );
    console.error(
      `[studio] Stripe session ${session.id} rejected (${mismatch}): got ${session.amount_total} ${currency || '?'}, expected ${expectedCents} usd for payment ${paymentId}`,
    );
    return { kind: 'rejected', paymentId, reason: mismatch };
  }

  // Attach an owner if the row has none (e.g. the account was deleted and re-created).
  let userId = row.user_id ? String(row.user_id) : null;
  if (!userId) {
    userId =
      (await existingUserId(c, session.metadata?.user_id)) ??
      (await existingUserId(c, session.client_reference_id)) ??
      (await userIdByEmail(c, sessionEmail(session) ?? row.email));
  }
  await c.query(
    `UPDATE studio_payments
        SET status = 'paid', user_id = COALESCE(user_id, $2), email = COALESCE(email, $3),
            raw = COALESCE(raw, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
      WHERE id = $1`,
    [paymentId, userId, sessionEmail(session), JSON.stringify(summary)],
  );

  const result = await fulfillPayment(c, paymentId);
  if (result) return { kind: 'credited', paymentId, userId: result.userId, credits: result.credits, balance: result.balance };
  console.warn(`[studio] Stripe payment ${paymentId} is paid but has no account yet; credits wait for sign-up`);
  return { kind: 'paid_unassigned', paymentId };
}

/** checkout.session.completed with an async payment method still pending: keep the row in sync. */
export async function recordUnpaidStripeSession(
  c: PoolClient,
  session: StripeCheckoutSession,
  context: { eventId?: string } = {},
): Promise<StripeSessionOutcome> {
  const row = await lockStripePayment(c, session);
  if (!row) return { kind: 'ignored', reason: 'not_a_studio_session' };
  await c.query(
    `UPDATE studio_payments SET raw = COALESCE(raw, '{}'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [row.id, JSON.stringify(stripeSessionSummary(session, { via: 'webhook', event_id: context.eventId ?? null }))],
  );
  return { kind: 'recorded', paymentId: String(row.id) };
}

/** checkout.session.expired / async_payment_failed: a still-pending payment becomes 'failed'. */
export async function markStripeSessionFailed(
  c: PoolClient,
  session: StripeCheckoutSession,
  reason: string,
): Promise<boolean> {
  const { rowCount } = await c.query(
    `UPDATE studio_payments
        SET status = 'failed', raw = COALESCE(raw, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
      WHERE provider = 'stripe' AND external_id = $1 AND status = 'pending' AND credited_at IS NULL`,
    [session.id, JSON.stringify(stripeSessionSummary(session, { failure: reason }))],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * charge.refunded: marks the matching payment refunded when the charge was fully refunded
 * (partial refunds are only logged). Credits are left untouched — review them manually.
 */
export async function markStripeChargeRefunded(
  c: PoolClient,
  charge: StripeCharge,
): Promise<{ paymentId: string; full: boolean } | null> {
  const paymentIntent = idOf(charge.payment_intent);
  if (!paymentIntent) return null;
  const { rows } = await c.query<PaymentRow>(
    `SELECT * FROM studio_payments WHERE provider = 'stripe' AND raw->>'payment_intent' = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [paymentIntent],
  );
  const row = rows[0];
  if (!row) return null;
  const full = charge.refunded === true;
  const note = {
    charge_id: charge.id,
    amount_refunded: charge.amount_refunded ?? null,
    amount: charge.amount ?? null,
    full,
  };
  if (full) {
    await markPaymentRefunded(c, 'stripe', row.external_id, note);
  } else {
    await c.query(
      `UPDATE studio_payments SET raw = COALESCE(raw, '{}'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [row.id, JSON.stringify({ partial_refund: { ...note, at: new Date().toISOString() } })],
    );
  }
  return { paymentId: String(row.id), full };
}

/**
 * Success-page safety net: when the buyer lands back on the Studio before (or without) the webhook,
 * asks Stripe for the session and fulfils it if it is paid. Only acts on the viewer's own session.
 * Errors are swallowed (logged) — the webhook remains the primary path.
 */
export async function syncStripeCheckoutSession(sessionId: string, userId: string): Promise<void> {
  const { secretKey } = studioEnv.stripe();
  if (!secretKey) return;
  try {
    const { rows } = await query<PaymentRow>(
      `SELECT * FROM studio_payments WHERE provider = 'stripe' AND external_id = $1`,
      [sessionId],
    );
    const row = rows[0];
    if (row) {
      if (row.credited_at || row.status === 'refunded') return;
      if (!row.user_id || String(row.user_id) !== userId) return;
    }
    const session = await retrieveCheckoutSession(secretKey, sessionId, { timeoutMs: 8000 });
    if (!row) {
      const owner = session.metadata?.user_id || session.client_reference_id;
      if (owner !== userId) return;
    }
    if (session.payment_status !== 'paid') return;
    await tx((c) => applyPaidStripeSession(c, session, { via: 'success_page' }));
  } catch (err) {
    console.error(`[studio] Could not sync Stripe session ${sessionId}:`, err);
  }
}

// ── PerfectPay ───────────────────────────────────────────────────────────────────────────────

export interface PerfectPaySale {
  /** PerfectPay sale code (unique per sale). */
  code: string;
  planId: PlanId;
  credits: number;
  email: string | null;
  amountCents: number;
  currency: string;
  /** Studio user id passed through the checkout link (`src`), used when the email has no account. */
  srcUserId: string | null;
  raw: Record<string, unknown>;
}

export type PerfectPayOutcome =
  | { kind: 'credited'; paymentId: string; userId: string; credits: number }
  | { kind: 'already_credited'; paymentId: string }
  | { kind: 'pending_claim'; paymentId: string }
  | { kind: 'refunded'; paymentId: string };

/** Upserts an approved PerfectPay sale and credits it when the buyer has an account. Call inside tx(). */
export async function recordPerfectPayApproved(c: PoolClient, sale: PerfectPaySale): Promise<PerfectPayOutcome> {
  const userId = (await userIdByEmail(c, sale.email)) ?? (await existingUserId(c, sale.srcUserId));
  const { rows } = await c.query<{ id: string; user_id: string | null; status: string; credited_at: Date | null }>(
    `INSERT INTO studio_payments (provider, external_id, user_id, email, plan_id, credits, amount_cents, currency, status, raw)
     VALUES ('perfectpay', $1, $2, $3, $4, $5, $6, $7, 'paid', $8::jsonb)
     ON CONFLICT (provider, external_id) DO UPDATE
        SET status = CASE WHEN studio_payments.status = 'refunded' THEN 'refunded' ELSE 'paid' END,
            user_id = COALESCE(studio_payments.user_id, EXCLUDED.user_id),
            email = COALESCE(studio_payments.email, EXCLUDED.email),
            raw = COALESCE(studio_payments.raw, '{}'::jsonb) || EXCLUDED.raw,
            updated_at = NOW()
     RETURNING id, user_id, status, credited_at`,
    [
      sale.code,
      userId,
      sale.email,
      sale.planId,
      sale.credits,
      sale.amountCents,
      sale.currency,
      JSON.stringify(sale.raw),
    ],
  );
  const row = rows[0];
  const paymentId = String(row.id);
  if (row.credited_at) return { kind: 'already_credited', paymentId };
  if (row.status === 'refunded') return { kind: 'refunded', paymentId };
  if (!row.user_id) return { kind: 'pending_claim', paymentId };
  const result = await fulfillPayment(c, paymentId);
  if (!result) return { kind: 'already_credited', paymentId };
  return { kind: 'credited', paymentId, userId: result.userId, credits: result.credits };
}

/**
 * Refund / chargeback of a PerfectPay sale. Marks the existing payment refunded; when the refund
 * arrives before the approval (out-of-order delivery) and the plan is known, records the sale as
 * refunded so a late approval can never credit it. Call inside tx().
 */
export async function recordPerfectPayRefund(
  c: PoolClient,
  code: string,
  sale: Omit<PerfectPaySale, 'code'> | null,
  note: Record<string, unknown>,
): Promise<{ id: string; userId: string | null; credited: boolean; created: boolean } | null> {
  const existing = await markPaymentRefunded(c, 'perfectpay', code, note);
  if (existing) return { ...existing, created: false };
  if (!sale) return null;
  const { rows } = await c.query<{ id: string }>(
    `INSERT INTO studio_payments (provider, external_id, user_id, email, plan_id, credits, amount_cents, currency, status, raw)
     VALUES ('perfectpay', $1, NULL, $2, $3, $4, $5, $6, 'refunded', $7::jsonb)
     ON CONFLICT (provider, external_id) DO NOTHING
     RETURNING id`,
    [
      code,
      sale.email,
      sale.planId,
      sale.credits,
      sale.amountCents,
      sale.currency,
      JSON.stringify({ ...sale.raw, refund: { ...note, at: new Date().toISOString() } }),
    ],
  );
  if (rows[0]) return { id: String(rows[0].id), userId: null, credited: false, created: true };
  // Lost a race with a concurrent approval: mark that row instead.
  const raced = await markPaymentRefunded(c, 'perfectpay', code, note);
  return raced ? { ...raced, created: false } : null;
}

// ── Success page snapshot ────────────────────────────────────────────────────────────────────

export type CheckoutPaymentState = 'credited' | 'pending' | 'failed';

export interface CheckoutStatusSnapshot {
  /** The user's balance at the moment of the snapshot (consistent with `payment`). */
  balance: number;
  payment: {
    state: CheckoutPaymentState;
    provider: PaymentProvider;
    planId: PlanId;
    credits: number;
  } | null;
}

interface SnapshotRow {
  balance: number;
  payment_id: string | null;
  provider: string | null;
  plan_id: string | null;
  credits: number | null;
  status: string | null;
  credited_at: Date | null;
}

/**
 * What the success page should show for this user:
 *   - stripeSessionId → that session's payment (only if it belongs to the user)
 *   - dev             → the user's latest simulated purchase (last 15 minutes)
 *   - otherwise       → a real purchase credited in the last 10 minutes (e.g. PerfectPay
 *                       redirects, where the webhook usually lands before the buyer does)
 * Returns null if the user does not exist.
 */
export async function getCheckoutStatus(
  userId: string,
  opts: { stripeSessionId?: string | null; dev?: boolean; planId?: PlanId | null } = {},
): Promise<CheckoutStatusSnapshot | null> {
  const columns = `u.credits AS balance, p.id AS payment_id, p.provider, p.plan_id, p.credits, p.status, p.credited_at`;
  let result;
  if (opts.stripeSessionId) {
    result = await query<SnapshotRow>(
      `SELECT ${columns}
         FROM studio_users u
         LEFT JOIN studio_payments p ON p.provider = 'stripe' AND p.external_id = $2 AND p.user_id = u.id
        WHERE u.id = $1`,
      [userId, opts.stripeSessionId],
    );
  } else if (opts.dev) {
    result = await query<SnapshotRow>(
      `SELECT ${columns}
         FROM studio_users u
         LEFT JOIN LATERAL (
           SELECT * FROM studio_payments
            WHERE user_id = u.id AND provider = 'dev' AND credited_at > NOW() - INTERVAL '15 minutes'
              AND ($2::text IS NULL OR plan_id = $2)
            ORDER BY credited_at DESC, id DESC
            LIMIT 1
         ) p ON TRUE
        WHERE u.id = $1`,
      [userId, opts.planId ?? null],
    );
  } else {
    result = await query<SnapshotRow>(
      `SELECT ${columns}
         FROM studio_users u
         LEFT JOIN LATERAL (
           SELECT * FROM studio_payments
            WHERE user_id = u.id AND provider <> 'dev' AND credited_at > NOW() - INTERVAL '10 minutes'
            ORDER BY credited_at DESC, id DESC
            LIMIT 1
         ) p ON TRUE
        WHERE u.id = $1`,
      [userId],
    );
  }
  const row = result.rows[0];
  if (!row) return null;
  const balance = Number(row.balance);
  if (!row.payment_id || !isPlanId(row.plan_id)) return { balance, payment: null };
  const state: CheckoutPaymentState = row.credited_at
    ? 'credited'
    : row.status === 'failed' || row.status === 'refunded'
      ? 'failed'
      : 'pending';
  return {
    balance,
    payment: {
      state,
      provider: (PROVIDERS as string[]).includes(row.provider || '') ? (row.provider as PaymentProvider) : 'dev',
      planId: row.plan_id,
      credits: Number(row.credits),
    },
  };
}
