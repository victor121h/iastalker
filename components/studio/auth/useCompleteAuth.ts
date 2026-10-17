'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { useI18n } from '@/lib/studio/i18n/client';
import { studioApi } from '@/lib/studio/api-client';
import type { PlanId } from '@/lib/studio/plans';
import type { PublicUser } from '@/lib/studio/types';
import { DEFAULT_AFTER_AUTH } from './redirect';

/**
 * Finishes a successful login / sign-up / password reset: stores the user in the session context,
 * applies their saved language and leaves the auth page.
 *
 * Destination: `next` when given; otherwise, when the visitor arrived with `?plan=` (e.g. from a
 * pricing card), straight to checkout for that plan; otherwise the studio chat.
 */
export function useCompleteAuth({ next, plan }: { next: string | null; plan?: PlanId | null }) {
  const router = useRouter();
  const { setUser } = useStudioSession();
  const { lang, setLang } = useI18n();

  return useCallback(
    async (user: PublicUser) => {
      setUser(user);
      if (user.lang !== lang) setLang(user.lang);

      if (!next && plan) {
        try {
          const { url } = await studioApi.checkout({ planId: plan });
          window.location.assign(url);
          return;
        } catch {
          // Payments unavailable or failed to start: land in the studio; checkout stays one click away.
        }
      }

      router.replace(next || DEFAULT_AFTER_AUTH);
      router.refresh();
    },
    [lang, next, plan, router, setLang, setUser],
  );
}
