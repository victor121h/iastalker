'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckoutStatusSnapshot } from '@/lib/studio/payments';
import { useI18n } from '@/lib/studio/i18n/client';
import { getPlan, type PlanId } from '@/lib/studio/plans';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Button, ButtonLink, CreditPill, Spinner } from '@/components/studio/ui';
import { IconAlert, IconArrowRight, IconCrown, IconLock, IconRefresh, IconUser } from '@/components/studio/icons';
import { FireBurst } from './FireBurst';
import { Emblem, StatusPanel, SupportLine } from './StatusPanel';

type View = 'confirming' | 'success' | 'slow' | 'failed';

/** Poll the balance this often while confirming… */
const POLL_MS = 2000;
/** …for this long before switching to the "being processed" message… */
const CONFIRM_TIMEOUT_MS = 90_000;
/** …then keep checking quietly in the background for a while longer. */
const SLOW_POLL_MS = 10_000;
const SLOW_POLL_MAX_MS = 10 * 60_000;
/** While confirming a Stripe session, re-render the server page so it can re-check with Stripe. */
const SERVER_RECHECK_MS = 10_000;

export interface CheckoutSuccessProps {
  loggedIn: boolean;
  /** Simulated purchase (already credited before the redirect). */
  dev: boolean;
  planId: PlanId | null;
  /** Stripe Checkout Session id from the success URL, if any. */
  sessionId: string | null;
  /** Server snapshot (null when logged out or when it could not be loaded). */
  snapshot: CheckoutStatusSnapshot | null;
  /** This page's own path + query (login/sign-up come back here). */
  nextPath: string;
}

export function CheckoutSuccess(props: CheckoutSuccessProps) {
  return <div className="py-4 sm:py-10">{props.loggedIn ? <Confirmation {...props} /> : <LoggedOut nextPath={props.nextPath} />}</div>;
}

function initialView(dev: boolean, snapshot: CheckoutStatusSnapshot | null): View {
  const state = snapshot?.payment?.state;
  if (state === 'credited') return 'success';
  if (state === 'failed') return 'failed';
  // Couldn't load the snapshot: dev purchases are credited before the redirect, so trust it.
  if (dev && !snapshot) return 'success';
  return 'confirming';
}

function Confirmation({ dev, planId, sessionId, snapshot }: CheckoutSuccessProps) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user, refreshUser } = useStudioSession();
  const [view, setView] = useState<View>(() => initialView(dev, snapshot));
  const [observedGain, setObservedGain] = useState<number | null>(null);
  // Balance before the purchase landed: the server snapshot is consistent with the payment state.
  const baseline = useRef<number>(snapshot?.balance ?? user?.credits ?? 0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // A fresher server snapshot (after router.refresh) can settle the state directly.
  const snapshotState = snapshot?.payment?.state;
  useEffect(() => {
    if (snapshotState === 'credited') setView('success');
    else if (snapshotState === 'failed') setView((v) => (v === 'success' ? v : 'failed'));
  }, [snapshotState]);

  // Watch the balance until the credits arrive.
  useEffect(() => {
    if (view !== 'confirming' && view !== 'slow') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const interval = view === 'confirming' ? POLL_MS : SLOW_POLL_MS;
    const limit = view === 'confirming' ? CONFIRM_TIMEOUT_MS : SLOW_POLL_MAX_MS;

    const tick = async () => {
      const fresh = await refreshUser();
      if (cancelled) return;
      if (fresh && fresh.credits > baseline.current) {
        setObservedGain(fresh.credits - baseline.current);
        setView('success');
        return;
      }
      if (Date.now() - startedAt >= limit) {
        if (view === 'confirming') setView('slow');
        return;
      }
      timer = setTimeout(tick, interval);
    };
    timer = setTimeout(tick, interval);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [view, refreshUser]);

  // Stripe: let the server page ask Stripe directly in case the webhook is late.
  useEffect(() => {
    if (!sessionId || view !== 'confirming') return;
    const id = setInterval(() => router.refresh(), SERVER_RECHECK_MS);
    return () => clearInterval(id);
  }, [sessionId, view, router]);

  // Make sure the header pill shows the new balance (the layout may have rendered first).
  useEffect(() => {
    if (view === 'success') void refreshUser();
  }, [view, refreshUser]);

  // Move focus to the new heading when the state changes (not on first paint).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [view]);

  const payment = snapshot?.payment ?? null;
  const purchasedPlanId: PlanId | null = payment?.planId ?? planId;
  const plan = purchasedPlanId ? getPlan(purchasedPlanId) : null;
  const added: number | null = payment ? payment.credits : observedGain ?? (dev && !snapshot && plan ? plan.credits : null);
  const balance = user?.credits ?? snapshot?.balance ?? null;
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  const liveMessage =
    view === 'confirming'
      ? t('checkout.success.confirmingTitle')
      : view === 'success'
        ? added
          ? t('checkout.success.creditsAdded', { count: added.toLocaleString(locale) })
          : t('checkout.success.creditsAddedGeneric')
        : view === 'slow'
          ? t('checkout.slow.title')
          : t('checkout.failed.title');

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      {view === 'confirming' && (
        <StatusPanel
          ref={headingRef}
          emblem={
            <span className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
              <span className="absolute -inset-3 rounded-full bg-studio-fire opacity-40 blur-xl animate-studio-pulse-glow" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-studio-line bg-studio-elevated text-studio-orange">
                <Spinner size={38} />
              </span>
            </span>
          }
          title={t('checkout.success.confirmingTitle')}
        >
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">
            {t('checkout.success.confirmingBody')}
          </p>
          <div className="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-studio-elevated" aria-hidden="true">
            <div className="h-full w-full studio-shimmer" />
          </div>
        </StatusPanel>
      )}

      {view === 'success' && (
        <StatusPanel
          ref={headingRef}
          emblem={<FireBurst />}
          eyebrow={t('checkout.success.title')}
          title={
            added ? (
              <CreditsHeadline template={t('checkout.success.creditsAdded')} value={added.toLocaleString(locale)} />
            ) : (
              t('checkout.success.creditsAddedGeneric')
            )
          }
          className="studio-glow"
        >
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">
            {plan ? t('checkout.success.body', { plan: plan.name }) : t('checkout.success.bodyGeneric')}
          </p>

          {balance !== null && (
            <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-studio-line bg-studio-elevated/70 px-4 py-3">
              <span className="text-sm text-studio-muted">{t('checkout.success.newBalance')}</span>
              <CreditPill credits={balance} />
            </div>
          )}
          {plan?.id === 'vip' && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-studio-gold">
              <IconCrown size={16} strokeWidth={2.2} />
              {t('checkout.success.vipUnlocked')}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/studio/account" variant="secondary" size="lg">
              <IconUser size={18} />
              {t('checkout.success.viewAccount')}
            </ButtonLink>
            <ButtonLink href="/studio/chat" size="lg">
              {t('common.startCreating')}
              <IconArrowRight size={18} />
            </ButtonLink>
          </div>

          {dev && (
            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-studio-amber">
              <IconAlert size={14} />
              {t('checkout.success.testNote')}
            </p>
          )}
        </StatusPanel>
      )}

      {view === 'slow' && (
        <StatusPanel
          ref={headingRef}
          glow="amber"
          emblem={
            <Emblem tone="amber">
              <IconRefresh size={34} />
            </Emblem>
          }
          title={t('checkout.slow.title')}
        >
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">{t('checkout.slow.body')}</p>
          {balance !== null && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
              <span className="text-sm text-studio-muted">{t('checkout.slow.balance')}</span>
              <CreditPill credits={balance} />
            </div>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setView('confirming');
                if (sessionId) router.refresh();
              }}
            >
              <IconRefresh size={18} />
              {t('checkout.slow.checkAgain')}
            </Button>
            <ButtonLink href="/studio/chat" size="lg">
              {t('common.startCreating')}
              <IconArrowRight size={18} />
            </ButtonLink>
          </div>
          <SupportLine className="mx-auto mt-7 max-w-md" template={t('checkout.slow.support')} />
        </StatusPanel>
      )}

      {view === 'failed' && (
        <StatusPanel
          ref={headingRef}
          glow="none"
          emblem={
            <Emblem tone="red">
              <IconAlert size={34} />
            </Emblem>
          }
          title={t('checkout.failed.title')}
        >
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">{t('checkout.failed.body')}</p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/studio/pricing" size="lg">
              {t('checkout.failed.tryAgain')}
              <IconArrowRight size={18} />
            </ButtonLink>
          </div>
          <SupportLine className="mx-auto mt-7 max-w-md" template={t('checkout.failed.support')} />
        </StatusPanel>
      )}
    </>
  );
}

/** "+{count} credits added" with the number in the fire gradient. */
function CreditsHeadline({ template, value }: { template: string; value: string }) {
  const [before, after = ''] = template.split('{count}');
  return (
    <span className="block text-3xl sm:text-4xl">
      {before}
      <span className="studio-gradient-text tabular-nums">{value}</span>
      {after}
    </span>
  );
}

function LoggedOut({ nextPath }: { nextPath: string }) {
  const { t } = useI18n();
  const next = encodeURIComponent(nextPath);
  return (
    <StatusPanel
      emblem={
        <Emblem tone="neutral">
          <IconLock size={34} />
        </Emblem>
      }
      title={t('checkout.loggedOut.title')}
    >
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">{t('checkout.loggedOut.body')}</p>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href={`/studio/signup?next=${next}`} variant="secondary" size="lg">
          {t('common.signup')}
        </ButtonLink>
        <ButtonLink href={`/studio/login?next=${next}`} size="lg">
          {t('common.login')}
          <IconArrowRight size={18} />
        </ButtonLink>
      </div>
    </StatusPanel>
  );
}
