'use client';

// /studio/pricing — headline, credit packs, cost table and a mini FAQ.
// Query params:
//   ?canceled=1          → info banner "Checkout canceled — no charge was made".
//   ?checkout=<planId>   → post-signup continuation: when logged in, start that checkout once.
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import {
  ASPECT_RATIOS,
  GENERATION_COST,
  PLANS,
  SUPPORT_EMAIL,
  VIDEO_DURATION_SECONDS,
  centsPerCredit,
  costPerGenerationCents,
  formatUSD,
  getPlan,
  isPlanId,
  type GenerationType,
  type PlanId,
} from '@/lib/studio/plans';
import { useCheckout, type UseCheckout } from '@/lib/studio/useCheckout';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { PricingCards } from '@/components/studio/PricingCards';
import { Alert, Spinner } from '@/components/studio/ui';
import { IconArrowRight, IconFlame, IconImage, IconVideo } from '@/components/studio/icons';
import { Faq, type FaqItem } from './Faq';
import { formatCount } from './format';
import { Container, Eyebrow, MarketingShell, SectionHeading, WithEmailLink } from './shared';

export function PricingPage() {
  const { t, lang } = useI18n();
  const { user } = useStudioSession();
  // One checkout instance shared by the cards and the automatic post-signup continuation, so
  // the clicked/auto-started plan shows the same spinner and error.
  const checkout = useCheckout();

  return (
    <MarketingShell>
      <section
        aria-labelledby="pricing-page-title"
        className="relative isolate overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="studio-noise absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_40%,transparent)]" />
          <div className="absolute -top-48 left-1/2 h-[560px] w-[1000px] max-w-[180%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,31,75,0.20),transparent)]" />
          <div className="absolute right-[-10rem] top-1/3 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(245,196,81,0.08),transparent)]" />
        </div>
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>{t('pricing.page.eyebrow')}</Eyebrow>
            <h1
              id="pricing-page-title"
              className="mt-4 text-balance font-display text-[40px] font-extrabold leading-[1.04] tracking-tight text-studio-text sm:text-6xl"
            >
              <span className="block">{t('pricing.page.titleA')}</span>
              <span className="studio-gradient-text block pb-1">{t('pricing.page.titleB')}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-studio-muted sm:text-lg">
              {t('pricing.page.subtitle')}
            </p>
            {user ? (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-studio-line bg-studio-surface/80 px-4 py-2 text-sm text-studio-muted">
                <IconFlame size={16} className="text-studio-orange" />
                {t('pricing.page.balance', { count: formatCount(user.credits, lang) })}
              </p>
            ) : null}
          </div>

          <Suspense fallback={null}>
            <CheckoutQueryHandler checkout={checkout} />
          </Suspense>

          <PricingCards variant="page" checkout={checkout} className="mt-14 sm:mt-16" />
        </Container>
      </section>

      <CostTable />
      <PricingFaq />
    </MarketingShell>
  );
}

// ── ?canceled / ?checkout handling ───────────────────────────────────────────────────────────
function CheckoutQueryHandler({ checkout }: { checkout: UseCheckout }) {
  const { t } = useI18n();
  const { user } = useStudioSession();
  const params = useSearchParams();
  const canceled = params.get('canceled') === '1';
  const requested = params.get('checkout');
  const [autoPlan, setAutoPlan] = useState<PlanId | null>(null);
  const started = useRef(false);
  const { startCheckout } = checkout;

  useEffect(() => {
    if (started.current || !user || !isPlanId(requested)) return;
    started.current = true;
    const planId = requested;
    setAutoPlan(planId);
    // Drop ?checkout= first so that coming Back from the payment page doesn't start it again.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      /* non-critical */
    }
    // Deferred on purpose (and never cancelled): useCheckout() resets its pending state in its
    // own mount effect, which may run after this one.
    window.setTimeout(() => void startCheckout(planId), 0);
  }, [requested, startCheckout, user]);

  const resuming = autoPlan !== null && checkout.pendingPlan === autoPlan;
  if (!canceled && !resuming) return null;

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-3">
      {resuming && autoPlan ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-studio-orange/40 bg-studio-orange/10 px-4 py-3 text-sm text-[#ffd9b8]"
        >
          <Spinner size={18} className="flex-none" />
          {t('pricing.page.resuming', { plan: getPlan(autoPlan).name })}
        </div>
      ) : canceled ? (
        <Alert variant="info">
          <p className="font-semibold">{t('pricing.page.canceled')}</p>
          <p className="mt-0.5 opacity-80">{t('pricing.page.canceledHint')}</p>
        </Alert>
      ) : null}
    </div>
  );
}

// ── Cost table ───────────────────────────────────────────────────────────────────────────────
function CostTable() {
  const { t } = useI18n();
  const best = PLANS.reduce((a, b) => (centsPerCredit(b) < centsPerCredit(a) ? b : a));
  const rows: Array<{ type: GenerationType; label: string; details: string; icon: ReactNode }> = [
    {
      type: 'image',
      label: t('common.image'),
      details: t('pricing.costs.imageDetails', { ratios: ASPECT_RATIOS.join(' · ') }),
      icon: <IconImage size={20} />,
    },
    {
      type: 'video',
      label: t('common.video'),
      details: t('pricing.costs.videoDetails', { seconds: VIDEO_DURATION_SECONDS }),
      icon: <IconVideo size={20} />,
    },
  ];

  return (
    <section aria-labelledby="costs-title" className="relative py-16 sm:py-24">
      <Container className="max-w-4xl">
        <SectionHeading id="costs-title" title={t('pricing.costs.title')} subtitle={t('pricing.costs.subtitle')} />
        <div className="mt-10 overflow-hidden rounded-3xl border border-studio-line bg-studio-surface/70">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t('pricing.costs.caption')}</caption>
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-studio-subtle">
              <tr>
                <th scope="col" className="px-4 py-3.5 font-semibold sm:px-6">
                  {t('pricing.costs.type')}
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  {t('pricing.costs.cost')}
                </th>
                <th scope="col" className="hidden px-3 py-3.5 font-semibold sm:table-cell">
                  {t('pricing.costs.details')}
                </th>
                <th scope="col" className="px-4 py-3.5 text-right font-semibold sm:px-6">
                  {t('pricing.costs.from')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-line">
              {rows.map((row) => (
                <tr key={row.type}>
                  <th scope="row" className="px-4 py-5 font-normal sm:px-6">
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-studio-red/30 bg-studio-fire-soft text-studio-orange">
                        {row.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-studio-text">{row.label}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-studio-subtle sm:hidden">
                          {row.details}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-3 py-5">
                    <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold tabular-nums text-studio-text">
                      <IconFlame size={16} className="text-studio-orange" />
                      {GENERATION_COST[row.type]}
                    </span>{' '}
                    <span className="text-xs text-studio-subtle">{t('common.credits')}</span>
                  </td>
                  <td className="hidden px-3 py-5 text-studio-muted sm:table-cell">{row.details}</td>
                  <td className="whitespace-nowrap px-4 py-5 text-right sm:px-6">
                    <span className="block font-display text-lg font-bold tabular-nums text-studio-gold">
                      {formatUSD(costPerGenerationCents(best, row.type))}
                    </span>
                    <span className="block text-xs text-studio-subtle">
                      {t('pricing.costs.withPlan', { plan: best.name })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}

// ── Mini FAQ ─────────────────────────────────────────────────────────────────────────────────
function PricingFaq() {
  const { t } = useI18n();
  const items: FaqItem[] = [
    { id: 'subscription', question: t('pricing.faq.subscription.q'), answer: <p>{t('pricing.faq.subscription.a')}</p> },
    { id: 'expiry', question: t('pricing.faq.expiry.q'), answer: <p>{t('pricing.faq.expiry.a')}</p> },
    { id: 'currency', question: t('pricing.faq.currency.q'), answer: <p>{t('pricing.faq.currency.a')}</p> },
    { id: 'failed', question: t('pricing.faq.failed.q'), answer: <p>{t('pricing.faq.failed.a')}</p> },
    {
      id: 'refund',
      question: t('pricing.faq.refund.q'),
      answer: (
        <p>
          <WithEmailLink text={t('pricing.faq.refund.a', { email: SUPPORT_EMAIL })} />
        </p>
      ),
    },
  ];

  return (
    <section aria-labelledby="pricing-faq-title" className="relative pb-24 pt-4 sm:pb-32">
      <Container className="max-w-3xl">
        <SectionHeading id="pricing-faq-title" title={t('pricing.faq.title')} />
        <Faq items={items} className="mt-10" />
        <p className="mt-8 text-center">
          <Link
            href="/studio#faq"
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-studio-orange transition-colors hover:text-studio-amber"
          >
            {t('pricing.faq.more')}
            <IconArrowRight size={16} />
          </Link>
        </p>
      </Container>
    </section>
  );
}
