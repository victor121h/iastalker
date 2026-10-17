'use client';

// Paywall shown when the user lacks credits for a generation (or opens "Buy credits"): what is
// missing, balance vs. cost, then the credit packs (PricingCards handles the checkout itself).
import { useEffect, useId, useRef } from 'react';
import { GENERATION_COST, type GenerationType } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { PricingCards } from '@/components/studio/PricingCards';
import { Modal } from '@/components/studio/ui';
import { IconFlame, IconImage, IconLock, IconVideo } from '@/components/studio/icons';

export function PaywallModal({
  open,
  onClose,
  missing,
  type,
}: {
  open: boolean;
  onClose: () => void;
  /** Credits the user is short of (null/0 → generic "unlock more" headline). */
  missing?: number | null;
  /** The generation the user tried to start, to show its cost. */
  type?: GenerationType | null;
}) {
  const { t } = useI18n();
  const { user } = useStudioSession();
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const balance = user?.credits ?? 0;
  const short = missing && missing > 0 ? missing : 0;
  const cost = type ? GENERATION_COST[type] : null;

  // Move focus into the dialog so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy={titleId}>
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-studio-fire-soft blur-3xl"
        />
        <div className="relative px-5 pb-5 pt-9 text-center sm:px-10 sm:pt-11">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl studio-gradient-bg studio-glow">
            {short > 0 ? <IconLock size={26} className="text-white" /> : <IconFlame size={28} className="text-white" />}
          </span>
          <h2
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="mt-5 font-display focus-visible:!outline-none text-2xl font-bold tracking-tight text-studio-text sm:text-3xl">
            {short > 0 ? (
              <HighlightNumber
                text={short === 1 ? t('chat.paywall.titleMissingOne') : t('chat.paywall.titleMissing', { missing: short })}
                value={short}
              />
            ) : (
              t('chat.paywall.title')
            )}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-studio-muted">{t('chat.paywall.subtitle')}</p>

          <dl className="mx-auto mt-5 flex max-w-sm items-stretch justify-center divide-x divide-studio-line overflow-hidden rounded-2xl border border-studio-line bg-studio-bg/60 text-left">
            <div className="flex-1 px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-studio-subtle">{t('chat.paywall.balance')}</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-bold text-studio-text">
                <IconFlame size={16} className="text-studio-orange" />
                <span className="tabular-nums">{balance.toLocaleString()}</span>
                <span className="text-xs font-medium text-studio-subtle">{t('common.credits')}</span>
              </dd>
            </div>
            {type && cost !== null && (
              <div className="flex-1 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-studio-subtle">
                  {type === 'video' ? t('chat.paywall.costVideo') : t('chat.paywall.costImage')}
                </dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-bold text-studio-text">
                  {type === 'video' ? (
                    <IconVideo size={16} className="text-studio-amber" />
                  ) : (
                    <IconImage size={16} className="text-studio-amber" />
                  )}
                  <span className="tabular-nums">{cost}</span>
                  <span className="text-xs font-medium text-studio-subtle">{t('common.credits')}</span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="relative px-4 pb-4 sm:px-8">
          <PricingCards variant="modal" />
        </div>

        <p className="relative px-5 pb-6 pt-2 text-center text-xs text-studio-subtle">
          {t('chat.paywall.rates', { image: GENERATION_COST.image, video: GENERATION_COST.video })}
        </p>
      </div>
    </Modal>
  );
}

/** Renders `text` with the first occurrence of `value` in the fire gradient. */
function HighlightNumber({ text, value }: { text: string; value: number }) {
  const needle = String(value);
  const at = text.indexOf(needle);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="studio-gradient-text">{needle}</span>
      {text.slice(at + needle.length)}
    </>
  );
}
