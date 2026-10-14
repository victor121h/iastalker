'use client';
// OWNED BY THE PAYMENTS SLICE — stub with the agreed signature.
import { useState } from 'react';
import type { PlanId } from './plans';

export interface UseCheckout {
  /** Starts checkout for a plan (redirects to sign-up first when logged out). */
  startCheckout: (planId: PlanId) => Promise<void>;
  /** Plan currently being processed (button spinner), or null. */
  pendingPlan: PlanId | null;
  /** Translated error message of the last attempt, or null. */
  error: string | null;
}

export function useCheckout(): UseCheckout {
  const [pendingPlan] = useState<PlanId | null>(null);
  return { startCheckout: async () => {}, pendingPlan, error: null };
}
