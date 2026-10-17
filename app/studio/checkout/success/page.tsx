import type { Metadata } from 'next';
import { getSessionUserRow, type UserRow } from '@/lib/studio/auth';
import { studioEnv } from '@/lib/studio/env';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { getCheckoutStatus, syncStripeCheckoutSession, type CheckoutStatusSnapshot } from '@/lib/studio/payments';
import { isPlanId } from '@/lib/studio/plans';
import { isCheckoutSessionId } from '@/lib/studio/stripe';
import { CheckoutSuccess } from '@/components/studio/checkout/CheckoutSuccess';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: translate(getRequestLang(), 'checkout.meta.successTitle'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /studio/checkout/success — where Stripe (?session_id=), the dev checkout (?dev=1&plan=) and
 * PerfectPay's thank-you redirect land. Works logged out (asks to log in and come back).
 */
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const rawPlan = first(searchParams.plan);
  const planId = isPlanId(rawPlan) ? rawPlan : null;
  const rawSession = first(searchParams.session_id);
  const sessionId = isCheckoutSessionId(rawSession) ? rawSession : null;
  const dev = first(searchParams.dev) === '1' && !sessionId && studioEnv.devPurchasesEnabled();

  let user: UserRow | null = null;
  try {
    user = await getSessionUserRow();
  } catch (err) {
    console.error('[studio] Checkout success page could not load the session:', err);
  }

  let snapshot: CheckoutStatusSnapshot | null = null;
  if (user) {
    const userId = String(user.id);
    try {
      // Safety net for late/missing webhooks: ask Stripe directly (only for the viewer's own session).
      if (sessionId) await syncStripeCheckoutSession(sessionId, userId);
      snapshot = await getCheckoutStatus(userId, { stripeSessionId: sessionId, dev, planId });
    } catch (err) {
      console.error('[studio] Checkout success page could not load the payment status:', err);
    }
  }

  const query = new URLSearchParams();
  if (sessionId) query.set('session_id', sessionId);
  if (dev) query.set('dev', '1');
  if (planId) query.set('plan', planId);
  const qs = query.toString();
  const nextPath = `/studio/checkout/success${qs ? `?${qs}` : ''}`;

  return (
    <CheckoutSuccess
      loggedIn={!!user}
      dev={dev}
      planId={planId}
      sessionId={sessionId}
      snapshot={snapshot}
      nextPath={nextPath}
    />
  );
}
