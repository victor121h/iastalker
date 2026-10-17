import type { Metadata } from 'next';
import { LandingPage } from '@/components/studio/marketing/LandingPage';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { BRAND_NAME } from '@/lib/studio/plans';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const lang = getRequestLang();
  const title = `${BRAND_NAME} — ${translate(lang, 'landing.meta.title')}`;
  const description = translate(lang, 'landing.meta.description');
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: 'website', siteName: BRAND_NAME },
    twitter: { card: 'summary', title, description },
  };
}

export default function StudioLandingPage() {
  return <LandingPage />;
}
