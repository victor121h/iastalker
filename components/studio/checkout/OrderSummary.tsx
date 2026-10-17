'use client';

import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey, TranslateVars } from '@/lib/studio/i18n';
import {
  GENERATION_COST,
  centsPerCredit,
  formatUSD,
  generationsFor,
  savingsPercent,
  type GenerationType,
  type Plan,
} from '@/lib/studio/plans';
import { Badge, Card, cx } from '@/components/studio/ui';
import { IconCrown, IconFlame, IconImage, IconVideo } from '@/components/studio/icons';

type T = (key: MessageKey, vars?: TranslateVars) => string;

/** "1 image" / "12 images" / "1 vídeo" … */
export function unitLabel(t: T, count: number, type: GenerationType): string {
  if (type === 'image') return t(count === 1 ? 'checkout.unit.imageOne' : 'checkout.unit.imageMany', { count });
  return t(count === 1 ? 'checkout.unit.videoOne' : 'checkout.unit.videoMany', { count });
}

/** "= 30 images or 3 videos" */
export function equivalentLabel(t: T, credits: number): string {
  return t('checkout.summary.equivalent', {
    images: unitLabel(t, generationsFor(credits, 'image'), 'image'),
    videos: unitLabel(t, generationsFor(credits, 'video'), 'video'),
  });
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const { t } = useI18n();
  if (plan.badge === 'popular') return <Badge variant="hot">{t('checkout.badge.popular')}</Badge>;
  if (plan.badge === 'best_value') {
    return (
      <Badge variant="vip">
        <IconCrown size={12} strokeWidth={2.4} />
        {t('checkout.badge.bestValue')}
      </Badge>
    );
  }
  return null;
}

/** Order summary card for a credit pack (plan, credits, equivalence, per-credit price, total). */
export function OrderSummary({ plan, className }: { plan: Plan; className?: string }) {
  const { t, lang } = useI18n();
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const savings = savingsPercent(plan);
  const images = generationsFor(plan.credits, 'image');
  const videos = generationsFor(plan.credits, 'video');

  return (
    <Card className={cx('relative overflow-hidden', className)}>
      <section aria-labelledby="order-summary-title">
        <div className="relative border-b border-studio-line bg-studio-fire-soft px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="order-summary-title"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-studio-muted"
            >
              {t('checkout.summary.title')}
            </h2>
            <PlanBadge plan={plan} />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span
              className={cx(
                'flex h-14 w-14 flex-none items-center justify-center rounded-2xl studio-glow-sm',
                plan.id === 'vip'
                  ? 'bg-gradient-to-br from-studio-gold to-studio-amber text-[#2a1600]'
                  : 'studio-gradient-bg text-white',
              )}
              aria-hidden="true"
            >
              {plan.id === 'vip' ? <IconCrown size={28} strokeWidth={2} /> : <IconFlame size={28} strokeWidth={2} />}
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold tracking-tight text-studio-text sm:text-[28px]">
                {t('checkout.summary.pack', { plan: plan.name })}
              </p>
              <p className="text-sm text-studio-muted">{t('checkout.summary.creditPack')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="font-display text-5xl font-extrabold leading-none tracking-tight studio-gradient-text tabular-nums">
                {plan.credits.toLocaleString(locale)}
              </p>
              <p className="mt-1.5 text-sm font-medium text-studio-muted">{t('common.credits')}</p>
            </div>
            <p className="text-sm font-medium text-studio-text sm:text-right">{equivalentLabel(t, plan.credits)}</p>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            <li className="flex items-center gap-2.5 rounded-xl border border-studio-line bg-studio-elevated px-3 py-2.5">
              <IconImage size={18} className="flex-none text-studio-orange" />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold tabular-nums text-studio-text">{unitLabel(t, images, 'image')}</span>
                <span className="block text-xs text-studio-subtle">
                  {t('common.creditsCount', { count: GENERATION_COST.image })}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2.5 rounded-xl border border-studio-line bg-studio-elevated px-3 py-2.5">
              <IconVideo size={18} className="flex-none text-studio-orange" />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold tabular-nums text-studio-text">{unitLabel(t, videos, 'video')}</span>
                <span className="block text-xs text-studio-subtle">
                  {t('common.creditsCount', { count: GENERATION_COST.video })}
                </span>
              </span>
            </li>
          </ul>

          <dl className="space-y-3 border-t border-studio-line pt-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-studio-muted">{t('checkout.summary.perCredit')}</dt>
              <dd className="font-medium tabular-nums text-studio-text">{formatUSD(centsPerCredit(plan), { decimals: 3 })}</dd>
            </div>
            {savings > 0 && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-studio-muted">{t('checkout.summary.savings')}</dt>
                <dd className="font-semibold text-studio-success">{t('checkout.summary.savingsValue', { percent: savings })}</dd>
              </div>
            )}
          </dl>

          <div className="flex items-baseline justify-between gap-4 border-t border-studio-line pt-5">
            <span className="text-base font-semibold text-studio-text">{t('checkout.summary.total')}</span>
            <span className="font-display text-3xl font-bold tabular-nums text-studio-text">
              {formatUSD(plan.priceCents)}
              <span className="ml-1.5 text-sm font-medium text-studio-subtle">USD</span>
            </span>
          </div>
          <p className="text-xs text-studio-subtle">{t('checkout.summary.oneTime')}</p>
        </div>
      </section>
    </Card>
  );
}
