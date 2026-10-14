'use client';
// OWNED BY THE MARKETING SLICE — stub with the agreed props.
import type { PlanId } from '@/lib/studio/plans';

export interface PricingCardsProps {
  /** 'page' = full-size cards (landing/pricing), 'modal' = compact version for the paywall. */
  variant?: 'page' | 'modal';
  /** Override what happens on plan click (default: useCheckout().startCheckout). */
  onSelectPlan?: (planId: PlanId) => void;
  className?: string;
}

export function PricingCards(_props: PricingCardsProps) {
  return null;
}
