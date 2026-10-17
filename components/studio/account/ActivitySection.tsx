'use client';

// Credit activity: the user's ledger (newest first) with readable reasons, signed amounts and the
// balance after each entry.
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import type { LedgerEntryDTO, PaymentDTO } from '@/lib/studio/types';
import { ButtonLink, Spinner, cx } from '@/components/studio/ui';
import {
  IconBolt,
  IconFlame,
  IconImage,
  IconPencil,
  IconRefresh,
  IconSparkles,
  IconVideo,
} from '@/components/studio/icons';
import { ACCOUNT_HISTORY_LIMIT } from './constants';
import { LEDGER_LABEL_KEY, formatDateTime, formatNumber, ledgerKind, planName, type LedgerKind } from './format';
import { AccountSection, EmptyState, ShowMoreButton } from './Section';

const INITIAL_VISIBLE = 8;

const KIND_ICON: Record<LedgerKind, ReactNode> = {
  signup_bonus: <IconSparkles size={18} />,
  purchase: <IconFlame size={18} />,
  generation_image: <IconImage size={18} />,
  generation_video: <IconVideo size={18} />,
  generation: <IconBolt size={18} />,
  refund_image: <IconRefresh size={18} />,
  refund_video: <IconRefresh size={18} />,
  refund: <IconRefresh size={18} />,
  adjustment: <IconPencil size={18} />,
};

export function ActivitySection({
  ledger,
  payments,
  refreshing,
  onRefresh,
}: {
  ledger: LedgerEntryDTO[];
  payments: PaymentDTO[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  // Purchase entries reference the payment row → show which pack was bought.
  const planByPaymentId = useMemo(() => {
    const map: Record<string, string> = {};
    payments.forEach((p) => {
      map[p.id] = planName(p.planId);
    });
    return map;
  }, [payments]);

  const visible = expanded ? ledger : ledger.slice(0, INITIAL_VISIBLE);

  function labelOf(entry: LedgerEntryDTO): string {
    const kind = ledgerKind(entry);
    if (kind === 'purchase') {
      const plan = entry.refType === 'payment' && entry.refId ? planByPaymentId[entry.refId] : undefined;
      return plan
        ? t('account.activity.reason.purchasePlan', { plan })
        : t('account.activity.reason.purchase');
    }
    return t(LEDGER_LABEL_KEY[kind]);
  }

  return (
    <AccountSection
      id="activity"
      icon={<IconFlame size={20} />}
      title={t('account.activity.title')}
      subtitle={t('account.activity.subtitle')}
      actions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm text-studio-muted sm:px-3 transition-colors hover:bg-white/5 hover:text-studio-text disabled:opacity-60"
        >
          {refreshing ? <Spinner size={16} /> : <IconRefresh size={16} />}
          <span className="sr-only sm:not-sr-only">{refreshing ? t('account.refreshing') : t('account.refresh')}</span>
        </button>
      }
    >
      {ledger.length === 0 ? (
        <EmptyState
          icon={<IconFlame size={22} />}
          title={t('account.activity.empty.title')}
          body={t('account.activity.empty.body')}
          action={
            <ButtonLink href="/studio/chat" size="sm">
              <IconSparkles size={16} />
              {t('account.activity.empty.cta')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul id={listId} aria-label={t('account.activity.listLabel')} className="-my-1 divide-y divide-studio-line/70">
            {visible.map((entry) => {
              const kind = ledgerKind(entry);
              const positive = entry.delta > 0;
              const amount = formatNumber(Math.abs(entry.delta), lang);
              return (
                <li key={entry.id} className="flex items-center gap-3 py-3.5 sm:gap-4">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-10 w-10 flex-none items-center justify-center rounded-xl border',
                      positive
                        ? 'border-studio-success/20 bg-studio-success/10 text-studio-success'
                        : 'border-studio-line bg-white/[0.03] text-studio-muted',
                    )}
                  >
                    {KIND_ICON[kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-studio-text sm:text-[15px]">{labelOf(entry)}</p>
                    <p className="mt-0.5 text-xs text-studio-subtle">
                      <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt, lang)}</time>
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p
                      className={cx(
                        'text-sm font-semibold tabular-nums sm:text-[15px]',
                        entry.delta > 0 ? 'text-studio-success' : entry.delta < 0 ? 'text-studio-red' : 'text-studio-muted',
                      )}
                    >
                      <span aria-hidden="true">
                        {entry.delta > 0 ? '+' : entry.delta < 0 ? '−' : ''}
                        {amount}
                      </span>
                      <span className="sr-only">
                        {positive
                          ? t('account.activity.srAdded', { count: amount })
                          : t('account.activity.srSpent', { count: amount })}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-studio-subtle">
                      {t('account.activity.balanceAfter', { balance: formatNumber(entry.balanceAfter, lang) })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <ShowMoreButton
            expanded={expanded}
            hiddenCount={ledger.length - visible.length}
            onToggle={() => setExpanded((v) => !v)}
            controls={listId}
            moreLabel={t('account.showMore', { count: ledger.length - INITIAL_VISIBLE })}
            lessLabel={t('account.showLess')}
          />
          {expanded && ledger.length >= ACCOUNT_HISTORY_LIMIT ? (
            <p className="mt-3 text-center text-xs text-studio-subtle">
              {t('account.activity.limit', { count: ACCOUNT_HISTORY_LIMIT })}
            </p>
          ) : null}
        </>
      )}
    </AccountSection>
  );
}
