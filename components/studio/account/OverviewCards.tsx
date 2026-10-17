'use client';

// Overview: the credit balance (with what it buys) and the user's tier with a VIP upsell.
import Link from 'next/link';
import { useI18n } from '@/lib/studio/i18n/client';
import {
  GENERATION_COST,
  PLANS,
  centsPerCredit,
  formatUSD,
  generationsFor,
  getPlan,
  savingsPercent,
  tierRank,
  type Tier,
} from '@/lib/studio/plans';
import type { PublicUser } from '@/lib/studio/types';
import { ButtonLink, VipBadge, cx } from '@/components/studio/ui';
import { IconArrowRight, IconChat, IconCheck, IconCrown, IconFlame } from '@/components/studio/icons';
import { formatNumber } from './format';

export function CreditsCard({ user, className }: { user: PublicUser; className?: string }) {
  const { t, lang } = useI18n();
  const credits = Math.max(0, user.credits);
  const images = generationsFor(credits, 'image');
  const videos = generationsFor(credits, 'video');
  const imagesText = t(images === 1 ? 'account.credits.imagesOne' : 'account.credits.imagesOther', {
    count: formatNumber(images, lang),
  });
  const videosText = t(videos === 1 ? 'account.credits.videosOne' : 'account.credits.videosOther', {
    count: formatNumber(videos, lang),
  });
  const outOfCredits = credits < GENERATION_COST.image;
  const noVideo = !outOfCredits && credits < GENERATION_COST.video;

  return (
    <div
      className={cx(
        'studio-gradient-border studio-noise relative flex flex-col overflow-hidden rounded-3xl bg-studio-surface p-5 sm:p-7',
        className,
      )}
    >
      {/* Decorative glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-studio-orange/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-studio-red/15 blur-3xl"
      />

      <div className="relative flex flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-studio-muted">
          {t('account.credits.title')}
        </p>

        <div className="mt-3 flex items-end gap-3">
          <span
            aria-hidden="true"
            className="mb-1 flex h-12 w-12 flex-none items-center justify-center rounded-2xl studio-gradient-bg text-white studio-glow-sm sm:h-14 sm:w-14"
          >
            <IconFlame size={28} />
          </span>
          <p className="min-w-0 leading-none">
            <span className="studio-gradient-text font-display text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
              {formatNumber(credits, lang)}
            </span>{' '}
            <span className="text-base font-medium text-studio-muted sm:text-lg">{t('common.credits')}</span>
          </p>
        </div>

        <p className="mt-4 text-[15px] font-medium text-studio-text">
          {t('account.credits.estimate', { images: imagesText, videos: videosText })}
        </p>
        <p className="mt-1 text-sm text-studio-subtle">
          {t('account.credits.costs', { image: GENERATION_COST.image, video: GENERATION_COST.video })}
        </p>

        {outOfCredits || noVideo ? (
          <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-studio-orange/30 bg-studio-orange/10 px-3 py-2 text-sm text-[#ffd9b8]">
            <IconFlame size={16} className="mt-0.5 flex-none text-studio-orange" />
            {outOfCredits
              ? t('account.credits.empty')
              : t('account.credits.noVideo', { video: GENERATION_COST.video })}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5 sm:mt-auto sm:flex-row sm:pt-6">
          <ButtonLink href="/studio/pricing" size="lg" className="sm:flex-1">
            <IconFlame size={18} />
            {t('common.buyCredits')}
          </ButtonLink>
          <ButtonLink href="/studio/chat" variant="secondary" size="lg" className="sm:flex-1">
            <IconChat size={18} />
            {t('account.credits.openStudio')}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

const TIERS: Tier[] = ['free', 'basic', 'pro', 'vip'];

export function TierCard({ user, className }: { user: PublicUser; className?: string }) {
  const { t } = useI18n();
  const tier = user.tier;
  const isVip = tier === 'vip';
  const currentRank = tierRank(tier);
  const vip = getPlan('vip');
  const basic = PLANS[0];
  const rate = (cents: number) => formatUSD(cents, { decimals: 3 });

  const description = isVip
    ? t('account.plan.desc.vip')
    : tier === 'free'
      ? t('account.plan.desc.free')
      : t('account.plan.desc.paid');

  return (
    <div
      className={cx(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-studio-surface p-5 sm:p-7',
        isVip ? 'border-studio-gold/40' : 'border-studio-line',
        className,
      )}
    >
      {isVip ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-studio-gold/15 blur-3xl"
        />
      ) : null}

      <div className="relative flex flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-studio-muted">{t('account.plan.title')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p
            className={cx(
              'font-display text-3xl font-bold tracking-tight sm:text-4xl',
              isVip
                ? 'bg-gradient-to-r from-studio-gold to-studio-amber bg-clip-text text-transparent'
                : 'text-studio-text',
            )}
          >
            {t(`account.plan.tier.${tier}`)}
          </p>
          {isVip ? <VipBadge /> : null}
        </div>
        <p className="mt-2 text-sm text-studio-muted">{description}</p>

        {/* Tier ladder */}
        <ol aria-label={t('account.plan.ladderLabel')} className="mt-5 grid grid-cols-4 gap-1.5">
          {TIERS.map((step) => {
            const rank = tierRank(step);
            const reached = rank <= currentRank;
            const current = step === tier;
            return (
              <li key={step} className="min-w-0">
                <span
                  aria-hidden="true"
                  className={cx(
                    'block h-1.5 rounded-full',
                    reached
                      ? step === 'vip'
                        ? 'bg-gradient-to-r from-studio-gold to-studio-amber'
                        : 'studio-gradient-bg'
                      : 'bg-white/[0.07]',
                  )}
                />
                <span
                  className={cx(
                    'mt-1.5 flex items-center gap-1 truncate text-[11px] font-medium uppercase tracking-wider',
                    current ? 'text-studio-text' : reached ? 'text-studio-muted' : 'text-studio-subtle',
                  )}
                >
                  {current && step !== 'free' ? <IconCheck size={11} strokeWidth={3} aria-hidden="true" /> : null}
                  {t(`account.plan.tier.${step}`)}
                  {current ? (
                    <span className="sr-only">({t('account.plan.currentTier')})</span>
                  ) : reached ? (
                    <span className="sr-only">({t('account.plan.reachedTier')})</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 sm:mt-auto sm:pt-5">
          {isVip ? (
            <div className="rounded-2xl border border-studio-gold/25 bg-studio-gold/[0.06] p-4">
              <p className="flex items-start gap-2 text-sm text-studio-text">
                <IconCrown size={18} className="mt-px flex-none text-studio-gold" />
                {t('account.plan.vipPerk', { rate: rate(centsPerCredit(vip)) })}
              </p>
              <Link
                href="/studio/pricing"
                className="group mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-studio-gold hover:text-studio-amber"
              >
                {t('account.plan.topUp')}
                <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          ) : (
            <Link
              href="/studio/pricing"
              className="group block rounded-2xl border border-studio-red/30 bg-studio-fire-soft p-4 transition-colors hover:border-studio-orange/60"
            >
              <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-studio-text">
                <IconCrown size={18} className="flex-none text-studio-gold" />
                {t('account.plan.upsellTitle', { percent: savingsPercent(vip) })}
              </p>
              <p className="mt-1.5 text-sm text-studio-muted">
                {t('account.plan.upsellBody', {
                  credits: vip.credits,
                  price: formatUSD(vip.priceCents),
                  vipRate: rate(centsPerCredit(vip)),
                  basicRate: rate(centsPerCredit(basic)),
                })}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-studio-orange">
                {t('account.plan.upsellCta')}
                <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
