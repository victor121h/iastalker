'use client';

// Credit-pack cards. Conversion goals (from the business owner):
//  - Pro (the "featured" plan) must read as the smart deal: larger, glowing gradient border,
//    "Most popular" badge, "3× the credits for 2× the price" anchor, biggest CTA.
//  - VIP ("best value") must feel exclusive: gold-fire frame, crown, "Save 50%", extra perks.
//  - Basic stays plain and quiet (entry / decoy) with a secondary CTA.
// Every number is derived from PLANS via the plans.ts helpers — never hard-coded.
import { useId, useState, type ReactNode } from 'react';
import {
  PLANS,
  costPerGenerationCents,
  formatUSD,
  generationsFor,
  savingsPercent,
  type Plan,
  type PlanId,
} from '@/lib/studio/plans';
import { useCheckout, type UseCheckout } from '@/lib/studio/useCheckout';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import { formatCount } from './marketing/format';
import { Alert, Badge, Button, Spinner, cx } from './ui';
import { IconBolt, IconCheck, IconCrown, IconFlame, IconImage, IconLock, IconRefresh, IconVideo } from './icons';

export interface PricingCardsProps {
  /** 'page' = full-size cards (landing/pricing), 'modal' = compact version for the paywall. */
  variant?: 'page' | 'modal';
  /** Override what happens on plan click (default: useCheckout().startCheckout). */
  onSelectPlan?: (planId: PlanId) => void;
  className?: string;
  /**
   * Optional: share an existing useCheckout() instance (e.g. the pricing page's post-signup
   * auto-checkout) so the card spinner and error reflect it. Defaults to an internal instance.
   */
  checkout?: UseCheckout;
}

type Tone = 'base' | 'featured' | 'vip';

/** Reference plan for the per-unit anchors and savings (same base as savingsPercent()). */
const BASE_PLAN: Plan = PLANS[0];

function toneOf(plan: Plan): Tone {
  if (plan.featured) return 'featured';
  if (plan.badge === 'best_value') return 'vip';
  return 'base';
}

/** Mobile shows the featured plan first, then VIP, then the entry plan; desktop follows PLANS order. */
const MOBILE_ORDER: Record<Tone, string> = { featured: 'order-1', vip: 'order-2', base: 'order-3' };
const DESKTOP_ORDER_LG = ['lg:order-1', 'lg:order-2', 'lg:order-3', 'lg:order-4'];
const DESKTOP_ORDER_MD = ['md:order-1', 'md:order-2', 'md:order-3', 'md:order-4'];

const TAGLINE: Record<PlanId, MessageKey> = {
  basic: 'pricing.plan.basic.tagline',
  pro: 'pricing.plan.pro.tagline',
  vip: 'pricing.plan.vip.tagline',
};

const CTA: Record<PlanId, MessageKey> = {
  basic: 'pricing.cta.basic',
  pro: 'pricing.cta.pro',
  vip: 'pricing.cta.vip',
};

const BASE_FEATURES: MessageKey[] = [
  'pricing.feature.generate',
  'pricing.feature.reference',
  'pricing.feature.history',
  'pricing.feature.noExpiry',
  'pricing.feature.refunds',
];
const VIP_FEATURES: MessageKey[] = ['pricing.feature.vipBadge', 'pricing.feature.priority'];

/** 3 → "3", 2.01 → "2", 2.5 → "2.5". */
function ratio(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

interface PlanNumbers {
  price: string;
  priceWhole: string;
  priceCents: string;
  images: number;
  videos: number;
  imageNow: string;
  videoNow: string;
  imageWas: string | null;
  videoWas: string | null;
  savings: number;
  deal: { credits: string; price: string } | null;
}

function numbersFor(plan: Plan): PlanNumbers {
  const price = formatUSD(plan.priceCents);
  const dot = price.indexOf('.');
  const isBase = plan.id === BASE_PLAN.id;
  const creditsRatio = plan.credits / BASE_PLAN.credits;
  const priceRatio = plan.priceCents / BASE_PLAN.priceCents;
  return {
    price,
    priceWhole: dot >= 0 ? price.slice(0, dot) : price,
    priceCents: dot >= 0 ? price.slice(dot) : '',
    images: generationsFor(plan.credits, 'image'),
    videos: generationsFor(plan.credits, 'video'),
    imageNow: formatUSD(costPerGenerationCents(plan, 'image')),
    videoNow: formatUSD(costPerGenerationCents(plan, 'video')),
    imageWas: isBase ? null : formatUSD(costPerGenerationCents(BASE_PLAN, 'image')),
    videoWas: isBase ? null : formatUSD(costPerGenerationCents(BASE_PLAN, 'video')),
    savings: isBase ? 0 : savingsPercent(plan),
    // Only shown when it is a real deal (more credits multiplier than price multiplier).
    deal:
      !isBase && plan.featured && creditsRatio > priceRatio + 0.05
        ? { credits: ratio(creditsRatio), price: ratio(priceRatio) }
        : null,
  };
}

const VIP_BUTTON = cx(
  'inline-flex w-full select-none items-center justify-center gap-2.5 whitespace-nowrap font-semibold transition-all duration-150',
  'bg-[linear-gradient(135deg,#F5C451_0%,#FFB23F_42%,#FF6A1A_100%)] text-[#2a1200]',
  'shadow-[0_12px_32px_-12px_rgba(245,196,81,0.65)] hover:brightness-110 active:brightness-95',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100',
);

export function PricingCards({ variant = 'page', onSelectPlan, className, checkout: shared }: PricingCardsProps) {
  const { t } = useI18n();
  const own = useCheckout();
  const checkout = shared ?? own;
  const [lastPlan, setLastPlan] = useState<PlanId | null>(null);
  const compact = variant === 'modal';

  const select = (planId: PlanId) => {
    setLastPlan(planId);
    if (onSelectPlan) onSelectPlan(planId);
    else void checkout.startCheckout(planId);
  };

  // Errors are shown inside the card that was clicked; errors from an automatic checkout
  // (no click yet) go above the grid.
  const errorInCard = checkout.error && lastPlan ? lastPlan : null;

  return (
    <div className={className}>
      {checkout.error && !errorInCard ? (
        <Alert className={compact ? 'mb-4' : 'mx-auto mb-8 max-w-xl'}>{checkout.error}</Alert>
      ) : null}

      <ul
        aria-label={t('pricing.cards.label')}
        className={cx(
          'grid',
          compact
            ? 'gap-4 pt-3 md:grid-cols-3 md:items-stretch md:gap-3'
            : 'mx-auto max-w-md gap-9 pt-4 lg:max-w-none lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-7',
        )}
      >
        {PLANS.map((plan, index) => (
          <li
            key={plan.id}
            className={cx(
              'relative flex',
              MOBILE_ORDER[toneOf(plan)],
              compact ? DESKTOP_ORDER_MD[index] : DESKTOP_ORDER_LG[index],
              toneOf(plan) === 'featured' && (compact ? 'z-10 md:scale-[1.03]' : 'z-10 lg:scale-[1.04]'),
            )}
          >
            <PlanCard
              plan={plan}
              compact={compact}
              pending={checkout.pendingPlan === plan.id}
              locked={checkout.pendingPlan !== null && checkout.pendingPlan !== plan.id}
              error={errorInCard === plan.id ? checkout.error : null}
              onSelect={() => select(plan.id)}
            />
          </li>
        ))}
      </ul>

      <TrustRow compact={compact} />
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  compact,
  pending,
  locked,
  error,
  onSelect,
}: {
  plan: Plan;
  compact: boolean;
  pending: boolean;
  locked: boolean;
  error: string | null;
  onSelect: () => void;
}) {
  const { t, lang } = useI18n();
  const nameId = useId();
  const priceId = useId();
  const tone = toneOf(plan);
  const n = numbersFor(plan);

  const body = (
    <>
      {/* Header: name, tagline, savings */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={nameId}
            className={cx(
              'flex items-center gap-2 font-display font-bold tracking-tight',
              compact ? 'text-xl' : 'text-2xl',
              tone === 'base' ? 'text-studio-text/90' : 'text-studio-text',
            )}
          >
            {tone === 'vip' && <IconCrown size={compact ? 18 : 20} className="text-studio-gold" strokeWidth={2.2} />}
            {plan.name}
          </h3>
          {!compact && (
            <p className={cx('mt-1 text-sm', tone === 'base' ? 'text-studio-subtle' : 'text-studio-muted')}>
              {t(TAGLINE[plan.id])}
            </p>
          )}
        </div>
        {n.savings > 0 && (
          <Badge
            variant={tone === 'vip' ? 'outline' : 'success'}
            className={cx(
              'flex-none',
              tone === 'vip' && '!border-studio-gold/60 bg-studio-gold/10 !text-studio-gold',
              compact && '!px-2 !py-0.5 !text-[10px]',
            )}
          >
            <span aria-hidden="true">{t('pricing.save', { percent: n.savings })}</span>
            <span className="sr-only">{t('pricing.saveSr', { percent: n.savings })}</span>
          </Badge>
        )}
      </div>

      {/* Featured anchor: "3× the credits for 2× the price" */}
      {n.deal && (
        <p
          className={cx(
            'inline-flex w-fit items-center gap-1.5 border border-studio-orange/35 bg-studio-fire-soft font-semibold leading-snug text-studio-amber',
            compact ? 'mt-2.5 rounded-xl px-2.5 py-1 text-[11px]' : 'mt-4 rounded-2xl px-3 py-1.5 text-xs',
          )}
        >
          <IconBolt size={compact ? 12 : 14} strokeWidth={2.2} className="flex-none" />
          {t('pricing.deal', { credits: n.deal.credits, price: n.deal.price })}
        </p>
      )}

      {/* Price */}
      <div className={compact ? 'mt-3' : 'mt-6'}>
        <p id={priceId} className="flex items-start leading-none">
          <span className="sr-only">{n.price}</span>
          <span
            aria-hidden="true"
            className={cx(
              'font-display font-extrabold tracking-tight',
              compact ? 'text-[38px]' : 'text-[52px]',
              tone === 'vip'
                ? 'bg-gradient-to-br from-studio-gold via-studio-amber to-studio-orange bg-clip-text text-transparent'
                : tone === 'featured'
                  ? 'text-white'
                  : 'text-studio-text/85',
            )}
          >
            {n.priceWhole}
          </span>
          <span
            aria-hidden="true"
            className={cx(
              'font-display font-bold',
              compact ? 'mt-1 text-lg' : 'mt-1.5 text-2xl',
              tone === 'vip' ? 'text-studio-amber' : tone === 'featured' ? 'text-white' : 'text-studio-text/80',
            )}
          >
            {n.priceCents}
          </span>
        </p>
        {/* In the 3-column modal layout the trust row below already says "One-time payment". */}
        <p className={cx('text-studio-subtle', compact ? 'mt-1.5 text-[11px] md:hidden' : 'mt-2 text-xs')}>
          {t('pricing.oneTime')}
        </p>
      </div>

      {/* Credits + equivalence + per-unit anchors */}
      <div
        className={cx(
          'rounded-2xl border',
          compact ? 'mt-3 p-3' : 'mt-5 p-4',
          tone === 'featured'
            ? 'border-studio-red/25 bg-studio-red/[0.06]'
            : tone === 'vip'
              ? 'border-studio-gold/20 bg-studio-gold/[0.05]'
              : 'border-white/5 bg-black/20',
        )}
      >
        <p className="flex items-center gap-2">
          <IconFlame
            size={compact ? 18 : 22}
            className={
              tone === 'vip' ? 'text-studio-amber' : tone === 'featured' ? 'text-studio-orange' : 'text-studio-subtle'
            }
          />
          <span
            className={cx(
              'font-display font-bold tabular-nums leading-none',
              compact ? 'text-2xl' : 'text-[32px]',
              tone === 'featured' ? 'studio-gradient-text' : 'text-studio-text',
            )}
          >
            {formatCount(plan.credits, lang)}
          </span>
          <span className="text-sm text-studio-muted">{t('common.credits')}</span>
        </p>
        <p className={cx('text-studio-muted', compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm')}>
          {t('pricing.equivalence', {
            images: n.images === 1 ? t('pricing.unit.imageOne') : t('pricing.unit.images', { count: n.images }),
            videos: n.videos === 1 ? t('pricing.unit.videoOne') : t('pricing.unit.videos', { count: n.videos }),
          })}
        </p>
        <ul className={cx('space-y-1 border-t border-white/5', compact ? 'mt-2 pt-2 text-xs' : 'mt-3 pt-3 text-sm')}>
          <UnitPrice
            icon={<IconImage size={compact ? 13 : 15} />}
            was={n.imageWas}
            now={n.imageNow}
            unit={t('pricing.perImage')}
            tone={tone}
          />
          <UnitPrice
            icon={<IconVideo size={compact ? 13 : 15} />}
            was={n.videoWas}
            now={n.videoNow}
            unit={t('pricing.perVideo')}
            tone={tone}
          />
        </ul>
      </div>

      {/* Features */}
      {compact ? (
        tone === 'vip' ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-studio-gold">
            <IconCrown size={13} strokeWidth={2.2} />
            {t('pricing.vipPerks')}
          </p>
        ) : null
      ) : (
        <ul className="mt-6 space-y-2.5 text-sm" aria-label={t('pricing.included')}>
          {BASE_FEATURES.map((key) => (
            <li key={key} className="flex items-start gap-2.5">
              <CheckDot tone={tone} />
              <span className={tone === 'base' ? 'text-studio-muted' : 'text-studio-text/90'}>{t(key)}</span>
            </li>
          ))}
          {tone === 'vip' &&
            VIP_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-studio-gold to-studio-orange text-[#2a1200]"
                >
                  <IconCrown size={11} strokeWidth={2.6} />
                </span>
                <span className="font-semibold text-studio-gold">{t(key)}</span>
              </li>
            ))}
        </ul>
      )}

      {/* CTA */}
      <div className={cx('mt-auto', compact ? 'pt-4' : 'pt-7')}>
        {tone === 'vip' ? (
          <button
            type="button"
            onClick={onSelect}
            disabled={pending || locked}
            aria-busy={pending || undefined}
            aria-describedby={priceId}
            className={cx(VIP_BUTTON, compact ? 'h-11 rounded-xl text-[15px]' : 'h-14 rounded-2xl text-base')}
          >
            {pending ? <Spinner size={compact ? 16 : 20} /> : <IconCrown size={compact ? 16 : 18} strokeWidth={2.2} />}
            {t(CTA[plan.id])}
          </button>
        ) : (
          <Button
            onClick={onSelect}
            loading={pending}
            disabled={locked}
            aria-describedby={priceId}
            variant={tone === 'featured' ? 'primary' : 'secondary'}
            size={compact ? 'md' : tone === 'featured' ? 'lg' : 'md'}
            fullWidth
            className={cx(
              tone === 'featured' &&
                !compact &&
                '!h-[60px] !text-[17px] !shadow-[0_16px_44px_-14px_rgba(255,31,75,0.8),0_0_0_1px_rgba(255,138,31,0.25)]',
              tone === 'base' && !compact && '!h-12',
            )}
          >
            {!pending && tone === 'featured' && <IconFlame size={compact ? 16 : 19} />}
            {t(CTA[plan.id])}
          </Button>
        )}
        {error ? (
          <Alert className="mt-3" variant="error">
            {error}
          </Alert>
        ) : null}
      </div>
    </>
  );

  // ── Frames per tone ────────────────────────────────────────────────────────────────────────
  if (tone === 'featured') {
    return (
      <article
        aria-labelledby={nameId}
        className={cx(
          'studio-gradient-border studio-glow relative flex w-full flex-col rounded-3xl bg-[#170a0e]',
          compact ? 'px-4 pb-4 pt-6' : 'px-6 pb-7 pt-9 sm:px-7',
        )}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-px overflow-hidden rounded-[inherit]">
          <div className="absolute -top-28 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-studio-red/25 blur-3xl" />
          <div className="absolute -bottom-24 right-[-20%] h-48 w-48 rounded-full bg-studio-orange/10 blur-3xl" />
        </div>
        <TopBadge>
          <Badge variant="hot" className={compact ? '!text-[10px]' : '!px-3.5 !py-1.5'}>
            <IconFlame size={compact ? 12 : 14} strokeWidth={2.2} />
            {t('pricing.badge.popular')}
          </Badge>
        </TopBadge>
        <div className="relative flex flex-1 flex-col">{body}</div>
      </article>
    );
  }

  if (tone === 'vip') {
    return (
      <article
        aria-labelledby={nameId}
        className="relative flex w-full rounded-3xl bg-[linear-gradient(160deg,rgba(245,196,81,0.9)_0%,rgba(255,178,63,0.45)_30%,rgba(255,106,26,0.25)_60%,rgba(245,196,81,0.55)_100%)] p-px shadow-[0_24px_70px_-30px_rgba(245,196,81,0.5)]"
      >
        <TopBadge>
          <Badge
            variant="vip"
            className={cx(
              'shadow-[0_6px_20px_-6px_rgba(245,196,81,0.7)]',
              compact ? '!text-[10px]' : '!px-3.5 !py-1.5',
            )}
          >
            <IconCrown size={compact ? 12 : 14} strokeWidth={2.4} />
            {t('pricing.badge.bestValue')}
          </Badge>
        </TopBadge>
        <div
          className={cx(
            'relative flex w-full flex-col overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#140b0a]',
            compact ? 'px-4 pb-4 pt-6' : 'px-6 pb-7 pt-9 sm:px-7',
          )}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-studio-gold/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-44 w-44 rounded-full bg-studio-orange/10 blur-3xl" />
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-studio-gold/70 to-transparent" />
          </div>
          <div className="relative flex flex-1 flex-col">{body}</div>
        </div>
      </article>
    );
  }

  return (
    <article
      aria-labelledby={nameId}
      className={cx(
        'relative flex w-full flex-col rounded-3xl border border-studio-line bg-studio-surface/80',
        compact ? 'px-4 pb-4 pt-6' : 'px-6 pb-7 pt-9 sm:px-7',
      )}
    >
      {body}
    </article>
  );
}

function TopBadge({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
      {children}
    </div>
  );
}

function UnitPrice({
  icon,
  was,
  now,
  unit,
  tone,
}: {
  icon: ReactNode;
  was: string | null;
  now: string;
  unit: string;
  tone: Tone;
}) {
  const { t } = useI18n();
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="text-studio-subtle">
        {icon}
      </span>
      {was ? (
        <s className="text-studio-subtle decoration-studio-red/70 decoration-[1.5px]">
          <span className="sr-only">{t('pricing.was')} </span>
          {was}
        </s>
      ) : null}
      <span
        className={cx(
          'font-semibold tabular-nums',
          tone === 'vip' ? 'text-studio-gold' : tone === 'featured' ? 'text-studio-text' : 'text-studio-text/85',
        )}
      >
        {was ? <span className="sr-only">{t('pricing.now')} </span> : null}
        {now}
      </span>
      <span className="text-studio-subtle">{unit}</span>
    </li>
  );
}

function CheckDot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full',
        tone === 'featured'
          ? 'studio-gradient-bg text-white'
          : tone === 'vip'
            ? 'bg-studio-gold/15 text-studio-gold'
            : 'bg-white/[0.06] text-studio-muted',
      )}
    >
      <IconCheck size={11} strokeWidth={3} />
    </span>
  );
}

function TrustRow({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  const items: Array<{ key: MessageKey; icon: ReactNode }> = [
    { key: 'pricing.trust.secure', icon: <IconLock size={compact ? 13 : 16} /> },
    { key: 'pricing.trust.oneTime', icon: <IconCheck size={compact ? 13 : 16} /> },
    { key: 'pricing.trust.noExpiry', icon: <IconFlame size={compact ? 13 : 16} /> },
    { key: 'pricing.trust.refunds', icon: <IconRefresh size={compact ? 13 : 16} /> },
  ];
  return (
    <div className={compact ? 'mt-5' : 'mt-12'}>
      <ul
        aria-label={t('pricing.trust.label')}
        className={cx(
          'flex flex-wrap items-center justify-center text-studio-muted',
          compact ? 'gap-x-4 gap-y-1.5 text-[11px]' : 'gap-x-7 gap-y-3 text-sm',
        )}
      >
        {items.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="text-studio-orange">
              {item.icon}
            </span>
            {t(item.key)}
          </li>
        ))}
      </ul>
      {!compact && <p className="mt-3 text-center text-xs text-studio-subtle">{t('pricing.currencyNote')}</p>}
    </div>
  );
}
