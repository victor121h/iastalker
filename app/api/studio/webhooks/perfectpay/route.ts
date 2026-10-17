import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { tx } from '@/lib/studio/db';
import { studioEnv } from '@/lib/studio/env';
import { HttpError, json, route } from '@/lib/studio/http';
import { getPlan, type PlanId } from '@/lib/studio/plans';
import { recordPerfectPayApproved, recordPerfectPayRefund, type PerfectPaySale } from '@/lib/studio/payments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 256 * 1024;

/** PerfectPay sale_status_enum values. */
const APPROVED_STATUSES = [2, 10]; // approved, completed
const REFUND_STATUSES = [7, 9]; // refunded, charged_back

type Json = Record<string, unknown>;

/**
 * POST /api/studio/webhooks/perfectpay — PerfectPay postback receiver.
 * Authenticated by the account token PerfectPay includes in every body (constant-time compare).
 * Idempotent on retries (unique provider + sale code, guarded fulfilment).
 */
export const POST = route(
  async (req: NextRequest) => {
    const { token: expectedToken, planCodes } = studioEnv.perfectpay();
    if (!expectedToken) {
      console.error('[studio] PerfectPay webhook received but STUDIO_PERFECTPAY_TOKEN is not set');
      throw new HttpError(503, 'payments_unavailable', 'Webhook not configured');
    }

    const body = await readBody(req);
    if (!tokensMatch(body.token, expectedToken)) {
      console.warn('[studio] Rejected PerfectPay webhook: bad token');
      throw new HttpError(401, 'unauthorized', 'Invalid token');
    }

    const code = typeof body.code === 'string' ? body.code.trim() : typeof body.code === 'number' ? String(body.code) : '';
    if (!code || code.length > 200) throw new HttpError(400, 'invalid_input', 'Missing sale code');
    const status = Number(body.sale_status_enum);

    const planId = resolvePlan(body, planCodes);
    const sale = planId ? saleFrom(body, code, planId, status) : null;

    // ── Refund / chargeback ───────────────────────────────────────────────────────────────────
    if (REFUND_STATUSES.includes(status)) {
      const result = await tx((c) =>
        recordPerfectPayRefund(c, code, sale, {
          sale_status_enum: status,
          sale_status_detail: typeof body.sale_status_detail === 'string' ? body.sale_status_detail.slice(0, 100) : null,
        }),
      );
      const what = status === 9 ? 'charged back' : 'refunded';
      if (!result) {
        console.warn(`[studio] PerfectPay sale ${code} ${what} but it is unknown and has no known plan; ignored`);
      } else if (result.created) {
        console.warn(`[studio] PerfectPay sale ${code} ${what} before its approval arrived; recorded as refunded`);
      } else {
        console.warn(
          `[studio] PerfectPay sale ${code} ${what} → payment ${result.id} marked refunded` +
            (result.credited ? ` (credits already given to user ${result.userId}; review manually)` : ' (never credited)'),
        );
      }
      return json({ received: true });
    }

    // ── Anything else that is not an approval (pending boleto, rejected, cancelled…) ───────────
    if (!APPROVED_STATUSES.includes(status)) return json({ received: true, ignored: true });

    // ── Approved ──────────────────────────────────────────────────────────────────────────────
    if (!sale) {
      console.warn(`[studio] PerfectPay sale ${code} has an unknown plan/product code; ignored`);
      return json({ received: true, ignored: true });
    }
    if (!sale.email) console.warn(`[studio] PerfectPay sale ${code} has no usable customer email; recorded for manual review`);

    const outcome = await tx((c) => recordPerfectPayApproved(c, sale));
    if (outcome.kind === 'pending_claim') {
      console.info(`[studio] PerfectPay sale ${code} paid by an email without an account; credits wait for sign-up`);
    } else if (outcome.kind === 'refunded') {
      console.warn(`[studio] PerfectPay approval for already refunded sale ${code}; not credited`);
    }
    return json({ received: true });
  },
  { skipOriginCheck: true },
);

// ── Parsing helpers ──────────────────────────────────────────────────────────────────────────

/** JSON body (PerfectPay's format); form-encoded bodies with `a[b]=c` keys are accepted too. */
async function readBody(req: NextRequest): Promise<Json> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_input', 'Payload too large');
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Json;
    } catch {
      /* fall through */
    }
    throw new HttpError(400, 'invalid_input', 'Invalid JSON body');
  }
  if ((req.headers.get('content-type') || '').toLowerCase().includes('application/x-www-form-urlencoded')) {
    return parseNestedForm(trimmed);
  }
  throw new HttpError(400, 'invalid_input', 'Unsupported body');
}

function parseNestedForm(text: string): Json {
  const root: Json = {};
  new URLSearchParams(text).forEach((value, key) => {
    const path = key.replace(/\]/g, '').split('[').filter(Boolean);
    if (path.length === 0 || path.length > 5) return;
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') return;
      const next = node[segment];
      if (!next || typeof next !== 'object') node[segment] = {};
      node = node[segment] as Json;
    }
    const last = path[path.length - 1];
    if (last === '__proto__' || last === 'constructor' || last === 'prototype') return;
    node[last] = value;
  });
  return root;
}

function obj(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function tokensMatch(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || !received) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = crypto.createHash('sha256').update(received, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

function saleFrom(body: Json, code: string, planId: PlanId, status: number): PerfectPaySale {
  const plan = getPlan(planId);
  const saleAmount = typeof body.sale_amount === 'string' ? Number(body.sale_amount) : body.sale_amount;
  return {
    code,
    planId,
    credits: plan.credits,
    email: cleanEmail(obj(body.customer).email),
    amountCents:
      typeof saleAmount === 'number' && Number.isFinite(saleAmount) && saleAmount >= 0
        ? Math.round(saleAmount * 100)
        : plan.priceCents,
    currency: currencyOf(body),
    srcUserId: srcUserId(body),
    raw: summarize(body, status),
  };
}

function resolvePlan(body: Json, planCodes: Record<string, PlanId>): PlanId | null {
  const candidates = [obj(body.plan).code, obj(body.product).code];
  for (const candidate of candidates) {
    const code = typeof candidate === 'string' ? candidate.trim() : typeof candidate === 'number' ? String(candidate) : '';
    if (code && Object.prototype.hasOwnProperty.call(planCodes, code)) return planCodes[code];
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

/** PerfectPay sells in BRL by default (currency_enum 1); an explicit ISO code wins when present. */
function currencyOf(body: Json): string {
  if (typeof body.currency === 'string' && /^[a-z]{3}$/i.test(body.currency)) return body.currency.toLowerCase();
  return Number(body.currency_enum) === 1 ? 'brl' : 'usd';
}

/** The `src` we append to checkout links ("studio-u<id>") comes back in metadata.src. */
function srcUserId(body: Json): string | null {
  const src = obj(body.metadata).src;
  if (typeof src !== 'string') return null;
  const match = /^studio-u(\d{1,18})$/.exec(src.trim());
  return match ? match[1] : null;
}

/** What we keep from the postback: no token, no documents, phones or addresses. */
function summarize(body: Json, status: number): Json {
  const customer = obj(body.customer);
  const product = obj(body.product);
  const plan = obj(body.plan);
  const metadata = obj(body.metadata);
  const pick = (source: Json, keys: string[]) => {
    const out: Json = {};
    for (const key of keys) {
      const v = source[key];
      if (v !== undefined && v !== null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
        out[key] = typeof v === 'string' ? v.slice(0, 300) : v;
      }
    }
    return out;
  };
  return {
    perfectpay: {
      ...pick(body, [
        'code',
        'sale_amount',
        'currency_enum',
        'payment_method_enum',
        'payment_type_enum',
        'sale_status_detail',
        'date_created',
        'date_approved',
      ]),
      sale_status_enum: status,
      product: pick(product, ['code', 'name']),
      plan: pick(plan, ['code', 'name']),
      customer: pick(customer, ['email', 'full_name']),
      metadata: pick(metadata, ['src', 'utm_source', 'utm_medium', 'utm_campaign']),
      received_at: new Date().toISOString(),
    },
  };
}
