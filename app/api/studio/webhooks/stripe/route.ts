import type { NextRequest } from 'next/server';
import { tx } from '@/lib/studio/db';
import { studioEnv } from '@/lib/studio/env';
import { HttpError, json, route } from '@/lib/studio/http';
import {
  applyPaidStripeSession,
  markStripeChargeRefunded,
  markStripeSessionFailed,
  recordUnpaidStripeSession,
} from '@/lib/studio/payments';
import {
  verifyStripeSignature,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripeEvent,
} from '@/lib/studio/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 512 * 1024;

/**
 * POST /api/studio/webhooks/stripe — Stripe event receiver.
 * Answers 200 {received:true} for every authentic event (handled or ignored) so Stripe stops
 * retrying; 400 for bad signatures/bodies, 503 when unconfigured, 500 only when the DB fails
 * (Stripe retries those and fulfilment is idempotent).
 */
export const POST = route(
  async (req: NextRequest) => {
    const { webhookSecret } = studioEnv.stripe();
    if (!webhookSecret) {
      console.error('[studio] Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set');
      throw new HttpError(503, 'payments_unavailable', 'Webhook not configured');
    }

    const payload = await req.text();
    if (payload.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_input', 'Payload too large');

    const check = verifyStripeSignature({ payload, header: req.headers.get('stripe-signature'), secret: webhookSecret });
    if (!check.ok) {
      console.warn(`[studio] Rejected Stripe webhook: ${check.reason}`);
      throw new HttpError(400, 'invalid_input', 'Invalid signature');
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(payload) as StripeEvent;
    } catch {
      throw new HttpError(400, 'invalid_input', 'Invalid JSON');
    }
    if (!event || typeof event.type !== 'string' || !event.data || typeof event.data.object !== 'object' || !event.data.object) {
      throw new HttpError(400, 'invalid_input', 'Malformed event');
    }

    await handleEvent(event);
    return json({ received: true });
  },
  { skipOriginCheck: true },
);

async function handleEvent(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as StripeCheckoutSession;
      if (!isSession(session)) return;
      if (session.payment_status === 'paid') {
        const outcome = await tx((c) => applyPaidStripeSession(c, session, { via: 'webhook', eventId: event.id }));
        logOutcome(event, session.id, outcome.kind);
      } else {
        // Async payment methods: completion now, money later (async_payment_succeeded/failed).
        const outcome = await tx((c) => recordUnpaidStripeSession(c, session, { eventId: event.id }));
        logOutcome(event, session.id, outcome.kind);
      }
      return;
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as StripeCheckoutSession;
      if (!isSession(session)) return;
      const outcome = await tx((c) => applyPaidStripeSession(c, session, { via: 'webhook', eventId: event.id }));
      logOutcome(event, session.id, outcome.kind);
      return;
    }

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const session = event.data.object as StripeCheckoutSession;
      if (!isSession(session)) return;
      const reason = event.type === 'checkout.session.expired' ? 'expired' : 'async_payment_failed';
      const changed = await tx((c) => markStripeSessionFailed(c, session, reason));
      if (changed) console.info(`[studio] Stripe session ${session.id} marked failed (${reason})`);
      return;
    }

    case 'charge.refunded': {
      const charge = event.data.object as StripeCharge;
      if (!charge || typeof charge.id !== 'string') return;
      const result = await tx((c) => markStripeChargeRefunded(c, charge));
      if (!result) {
        console.warn(`[studio] Stripe refund for charge ${charge.id} does not match any Studio payment (event ${event.id})`);
      } else if (result.full) {
        console.warn(
          `[studio] Stripe charge ${charge.id} fully refunded → payment ${result.paymentId} marked refunded. Credits were NOT removed; review manually.`,
        );
      } else {
        console.warn(
          `[studio] Stripe charge ${charge.id} partially refunded (${charge.amount_refunded}/${charge.amount}) for payment ${result.paymentId}; status unchanged.`,
        );
      }
      return;
    }

    default:
      // Not an event we act on (Stripe may send others if the endpoint subscribes to them).
      return;
  }
}

function isSession(value: StripeCheckoutSession): boolean {
  return !!value && typeof value.id === 'string' && value.id.length > 0;
}

function logOutcome(event: StripeEvent, sessionId: string, kind: string) {
  if (kind === 'credited' || kind === 'already_credited' || kind === 'recorded') return;
  console.info(`[studio] Stripe ${event.type} for session ${sessionId} (event ${event.id}): ${kind}`);
}
