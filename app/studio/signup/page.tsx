import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/studio/auth';
import { translate } from '@/lib/studio/i18n';
import { getRequestLang } from '@/lib/studio/i18n/server';
import { SignupForm } from '@/components/studio/auth/SignupForm';
import { DEFAULT_AFTER_AUTH, planParam, safeNextPath } from '@/components/studio/auth/redirect';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: translate(getRequestLang(), 'auth.signup.metaTitle') };
}

type SearchParams = Record<string, string | string[] | undefined>;

async function isLoggedIn(): Promise<boolean> {
  try {
    return (await getCurrentUser()) !== null;
  } catch {
    return false; // DB hiccup: show the form; the API will report the real problem.
  }
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath(searchParams.next);
  const plan = planParam(searchParams.plan);
  if (await isLoggedIn()) redirect(next || DEFAULT_AFTER_AUTH);
  return <SignupForm next={next} plan={plan} />;
}
