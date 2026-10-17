'use client';

import { formatUSD, getPlan, type PlanId } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { IconCrown } from '@/components/studio/icons';

/** "After creating your account you'll continue to checkout for the Pro plan." */
export function PlanNote({ planId, context }: { planId: PlanId; context: 'login' | 'signup' }) {
  const { t } = useI18n();
  const plan = getPlan(planId);
  const text =
    context === 'signup'
      ? t('auth.signup.planNote', { plan: plan.name })
      : t('auth.login.planNote', { plan: plan.name });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-studio-gold/25 bg-studio-gold/[0.06] px-4 py-3" role="note">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-studio-gold to-studio-amber text-[#2a1600]">
        <IconCrown size={15} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-studio-text">{text}</p>
        <p className="mt-0.5 text-xs tabular-nums text-studio-muted">
          {t('auth.signup.planDetail', { price: formatUSD(plan.priceCents), credits: plan.credits })}
        </p>
      </div>
    </div>
  );
}
