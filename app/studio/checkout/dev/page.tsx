import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/studio/auth';
import { studioEnv } from '@/lib/studio/env';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { isPlanId } from '@/lib/studio/plans';
import type { PublicUser } from '@/lib/studio/types';
import { DevCheckout } from '@/components/studio/checkout/DevCheckout';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: translate(getRequestLang(), 'checkout.meta.devTitle'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** /studio/checkout/dev?plan=<id> — simulated purchase (login required, checked here). */
export default async function DevCheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = first(searchParams.plan);
  const planId = isPlanId(raw) ? raw : null;

  let user: PublicUser | null = null;
  let sessionKnown = true;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // DB hiccup: render the page; the purchase call will surface the real error.
    sessionKnown = false;
    console.error('[studio] Dev checkout could not load the session:', err);
  }
  if (!user && sessionKnown) {
    const self = planId ? `/studio/checkout/dev?plan=${planId}` : '/studio/checkout/dev';
    redirect(`/studio/login?next=${encodeURIComponent(self)}`);
  }

  return <DevCheckout planId={planId} enabled={studioEnv.devPurchasesEnabled()} />;
}
