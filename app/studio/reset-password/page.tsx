import type { Metadata } from 'next';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { ResetPasswordForm } from '@/components/studio/auth/ResetPasswordForm';
import { firstParam } from '@/components/studio/auth/redirect';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: translate(getRequestLang(), 'auth.reset.metaTitle'),
    robots: { index: false, follow: false },
    // The URL carries a one-time token: never leak it through the Referer header.
    referrer: 'no-referrer',
  };
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token = firstParam(searchParams.token)?.trim() || null;
  return <ResetPasswordForm token={token} />;
}
