'use client';
// Starts a credit-pack checkout from any client component (pricing cards, paywall modal…).
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { ApiError, studioApi } from './api-client';
import { useI18n } from './i18n/client';
import { isPlanId, type PlanId } from './plans';

export interface UseCheckout {
  /** Starts checkout for a plan (redirects to sign-up first when logged out). */
  startCheckout: (planId: PlanId) => Promise<void>;
  /** Plan currently being processed (button spinner), or null. */
  pendingPlan: PlanId | null;
  /** Translated error message of the last attempt, or null. */
  error: string | null;
}

/** Where to land after sign-up / login so the purchase continues where it started. */
function resumePath(planId: PlanId): string {
  return `/studio/pricing?checkout=${planId}`;
}

export function useCheckout(): UseCheckout {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useStudioSession();
  const { te } = useI18n();
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Reset the spinner once we actually navigated, and when the page is restored from the
  // back/forward cache after leaving for an external checkout.
  useEffect(() => {
    setPendingPlan(null);
    inFlight.current = false;
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setPendingPlan(null);
        inFlight.current = false;
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const startCheckout = useCallback(
    async (planId: PlanId) => {
      if (!isPlanId(planId) || inFlight.current) return;
      setError(null);

      if (!user) {
        router.push(`/studio/signup?plan=${planId}&next=${encodeURIComponent(resumePath(planId))}`);
        return;
      }

      inFlight.current = true;
      setPendingPlan(planId);
      try {
        const { url } = await studioApi.checkout({ planId });
        if (url.startsWith('/') && !url.startsWith('//')) {
          router.push(url);
          return; // spinner stays until the route changes
        }
        if (/^https?:\/\//i.test(url)) {
          window.location.href = url;
          return; // leaving the site; keep the spinner while the browser navigates
        }
        throw new ApiError('payments_unavailable', 502, 'Unexpected checkout URL');
      } catch (err) {
        inFlight.current = false;
        setPendingPlan(null);
        if (err instanceof ApiError && err.code === 'unauthorized') {
          // The session expired since the page was rendered: log in again, then resume.
          setUser(null);
          router.push(`/studio/login?plan=${planId}&next=${encodeURIComponent(resumePath(planId))}`);
          return;
        }
        setError(te(err instanceof ApiError ? err.code : 'internal'));
      }
    },
    [router, setUser, te, user],
  );

  return { startCheckout, pendingPlan, error };
}
