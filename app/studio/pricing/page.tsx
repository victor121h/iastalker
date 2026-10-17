import type { Metadata } from 'next';
import { PricingPage } from '@/components/studio/marketing/PricingPage';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const lang = getRequestLang();
  return {
    title: translate(lang, 'pricing.meta.title'),
    description: translate(lang, 'pricing.meta.description'),
  };
}

// The client page reads ?canceled / ?checkout with useSearchParams inside its own <Suspense>.
export default function StudioPricingPage() {
  return <PricingPage />;
}
