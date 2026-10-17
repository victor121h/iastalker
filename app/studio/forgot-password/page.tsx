import type { Metadata } from 'next';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { ForgotPasswordForm } from '@/components/studio/auth/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: translate(getRequestLang(), 'auth.forgot.metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
