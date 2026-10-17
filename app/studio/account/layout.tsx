// Server guard for the account page: only logged-in users get here; everyone else goes to the
// login page and comes back to /studio/account afterwards.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/studio/auth';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: translate(getRequestLang(), 'account.meta.title'),
    robots: { index: false, follow: false },
  };
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/studio/login?next=/studio/account');
  return <>{children}</>;
}
