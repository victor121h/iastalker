'use client';

// Purchases: the user's credit-pack orders with amount, credits and status.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { PLANS, SUPPORT_EMAIL, formatUSD } from '@/lib/studio/plans';
import type { PaymentDTO, PaymentStatus } from '@/lib/studio/types';
import { Badge, ButtonLink, cx } from '@/components/studio/ui';
import { IconArrowRight, IconCrown, IconFlame, IconMail } from '@/components/studio/icons';
import { formatDateTime, formatMoney, formatNumber, planName } from './format';
import { AccountSection, EmptyState, ShowMoreButton } from './Section';

const INITIAL_VISIBLE = 5;

const STATUS_BADGE: Record<PaymentStatus, 'success' | 'outline' | 'neutral'> = {
  paid: 'success',
  pending: 'outline',
  refunded: 'neutral',
  failed: 'neutral',
};

export function PurchasesSection({ payments }: { payments: PaymentDTO[] }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? payments : payments.slice(0, INITIAL_VISIBLE);
  const hasPending = payments.some((p) => p.status === 'pending');
  const cheapest = PLANS.reduce((min, p) => (p.priceCents < min ? p.priceCents : min), PLANS[0].priceCents);

  return (
    <AccountSection
      id="purchases"
      icon={<IconCrown size={20} />}
      title={t('account.purchases.title')}
      subtitle={t('account.purchases.subtitle')}
    >
      {payments.length === 0 ? (
        <EmptyState
          icon={<IconCrown size={22} />}
          title={t('account.purchases.empty.title')}
          body={t('account.purchases.empty.body', { price: formatUSD(cheapest) })}
          action={
            <ButtonLink href="/studio/pricing" size="sm">
              {t('account.purchases.empty.cta')}
              <IconArrowRight size={16} />
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul id={listId} aria-label={t('account.purchases.listLabel')} className="-my-1 divide-y divide-studio-line/70">
            {visible.map((payment) => {
              const isVip = payment.planId === 'vip';
              const isTest = payment.provider === 'dev';
              return (
                <li key={payment.id} className="flex items-center gap-3 py-4 sm:gap-4">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-11 w-11 flex-none items-center justify-center rounded-xl',
                      isVip
                        ? 'bg-gradient-to-br from-studio-gold to-studio-amber text-[#2a1600]'
                        : 'studio-gradient-bg text-white',
                      payment.status !== 'paid' && 'opacity-60',
                    )}
                  >
                    {isVip ? <IconCrown size={20} /> : <IconFlame size={20} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-studio-text sm:text-[15px]">
                        {t('account.purchases.pack', { plan: planName(payment.planId) })}
                      </span>
                      <Badge variant={STATUS_BADGE[payment.status]} className="!px-2 !py-0.5 !text-[10px]">
                        {t(`account.purchases.status.${payment.status}`)}
                      </Badge>
                      {isTest ? (
                        <span title={t('account.purchases.testHint')}>
                          <Badge variant="neutral" className="!px-2 !py-0.5 !text-[10px]">
                            {t('account.purchases.test')}
                          </Badge>
                          <span className="sr-only"> — {t('account.purchases.testHint')}</span>
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-studio-subtle">
                      <time dateTime={payment.createdAt}>{formatDateTime(payment.createdAt, lang)}</time>
                      <span aria-hidden="true"> · </span>
                      <span className="sr-only">, </span>
                      <span className="tabular-nums">
                        {t('account.purchases.credits', { count: formatNumber(payment.credits, lang) })}
                      </span>
                    </p>
                  </div>

                  <p
                    className={cx(
                      'flex-none text-right text-sm font-semibold tabular-nums sm:text-base',
                      payment.status === 'refunded' ? 'text-studio-subtle line-through' : 'text-studio-text',
                    )}
                  >
                    {formatMoney(payment.amountCents, payment.currency, lang)}
                  </p>
                </li>
              );
            })}
          </ul>
          <ShowMoreButton
            expanded={expanded}
            hiddenCount={payments.length - visible.length}
            onToggle={() => setExpanded((v) => !v)}
            controls={listId}
            moreLabel={t('account.showMore', { count: payments.length - INITIAL_VISIBLE })}
            lessLabel={t('account.showLess')}
          />
          {hasPending ? (
            <p className="mt-4 rounded-xl border border-studio-orange/25 bg-studio-orange/[0.06] px-3.5 py-2.5 text-xs text-[#ffd9b8]">
              {t('account.purchases.pendingHint')}
            </p>
          ) : null}
        </>
      )}

      <p className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-studio-subtle">
        <IconMail size={14} className="flex-none" />
        {t('account.purchases.helpPrefix')}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="rounded font-medium text-studio-orange underline-offset-2 hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </AccountSection>
  );
}
