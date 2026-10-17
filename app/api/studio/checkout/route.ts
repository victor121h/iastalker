import type { NextRequest } from 'next/server';
import { requireUserRow, type UserRow } from '@/lib/studio/auth';
import { studioEnv } from '@/lib/studio/env';
import { HttpError, enforceRateLimit, json, readJson, requestOrigin, route } from '@/lib/studio/http';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { recordStripeCheckout } from '@/lib/studio/payments';
import { BRAND_NAME, getPlan, isPlanId, type Plan } from '@/lib/studio/plans';
import {
  StripeApiError,
  buildCheckoutSessionParams,
  checkoutIdempotencyKey,
  createCheckoutSession,
} from '@/lib/studio/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKOUTS_PER_WINDOW = 12;

/** POST /api/studio/checkout {planId} → {url} (Stripe Checkout, PerfectPay link or the dev page). */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUserRow();
  const body = await readJson(req, 4 * 1024);
  const planId = body.planId;
  if (!isPlanId(planId)) throw new HttpError(400, 'invalid_input', 'Unknown plan', { field: 'planId' });
  enforceRateLimit(`studio:checkout:user:${user.id}`, MAX_CHECKOUTS_PER_WINDOW, WINDOW_MS);

  const plan = getPlan(planId);
  const provider = studioEnv.paymentProvider();
  switch (provider) {
    case 'stripe':
      return json({ url: await stripeCheckoutUrl(req, user, plan) });
    case 'perfectpay':
      return json({ url: perfectPayCheckoutUrl(user, plan) });
    case 'dev':
      if (!studioEnv.devPurchasesEnabled()) {
        console.error('[studio] STUDIO_PAYMENT_PROVIDER=dev but STUDIO_DEV_PURCHASES is off');
        throw new HttpError(503, 'payments_unavailable', 'Payments are not configured');
      }
      return json({ url: `/studio/checkout/dev?plan=${plan.id}` });
    default:
      throw new HttpError(503, 'payments_unavailable', 'No payment provider is configured');
  }
});

async function stripeCheckoutUrl(req: NextRequest, user: UserRow, plan: Plan): Promise<string> {
  const { secretKey } = studioEnv.stripe();
  if (!secretKey) {
    console.error('[studio] STUDIO_PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not set');
    throw new HttpError(503, 'payments_unavailable', 'Payments are not configured');
  }
  const userId = String(user.id);
  const params = buildCheckoutSessionParams({
    brandName: BRAND_NAME,
    planId: plan.id,
    planName: plan.name,
    priceCents: plan.priceCents,
    credits: plan.credits,
    userId,
    email: user.email,
    baseUrl: studioEnv.publicUrl(requestOrigin(req)),
    locale: getRequestLang() === 'pt' ? 'pt-BR' : 'en',
  });

  let session;
  try {
    session = await createCheckoutSession(secretKey, params, { idempotencyKey: checkoutIdempotencyKey(params) });
  } catch (err) {
    if (err instanceof StripeApiError) {
      console.error('[studio] Stripe Checkout Session creation failed:', {
        status: err.status,
        type: err.type,
        code: err.code,
        requestId: err.requestId,
        message: err.message,
        userId,
        plan: plan.id,
      });
    } else {
      console.error('[studio] Stripe Checkout Session creation failed:', err);
    }
    throw new HttpError(502, 'payments_unavailable', 'Could not start the checkout. Please try again.');
  }

  await recordStripeCheckout({
    sessionId: session.id,
    userId,
    email: user.email,
    planId: plan.id,
    credits: plan.credits,
    amountCents: plan.priceCents,
  });
  return session.url as string;
}

function perfectPayCheckoutUrl(user: UserRow, plan: Plan): string {
  const raw = studioEnv.perfectpay().checkoutUrls[plan.id];
  let url: URL | null = null;
  try {
    url = raw ? new URL(raw) : null;
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    console.error(`[studio] STUDIO_PERFECTPAY_URL_${plan.id.toUpperCase()} is missing or invalid`);
    throw new HttpError(503, 'payments_unavailable', 'Payments are not configured');
  }
  // Pre-fill the buyer so the webhook can match the sale to this account by email.
  url.searchParams.set('email', user.email);
  const name = (user.name || '').trim();
  if (name) url.searchParams.set('name', name);
  // Fallback attribution if the buyer types a different email at checkout (echoed back as metadata.src).
  if (!url.searchParams.has('src')) url.searchParams.set('src', `studio-u${user.id}`);
  return url.toString();
}
