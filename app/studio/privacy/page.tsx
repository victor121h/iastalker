import type { Metadata } from 'next';
import { LegalPage } from '@/components/studio/marketing/LegalPage';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const lang = getRequestLang();
  return {
    title: translate(lang, 'legal.privacy.metaTitle'),
    description: translate(lang, 'legal.privacy.metaDescription'),
  };
}

export default function StudioPrivacyPage() {
  return <LegalPage doc="privacy" />;
}
