'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { getPlan, type PlanId } from '@/lib/studio/plans';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Alert, Button, ButtonLink, Card } from '@/components/studio/ui';
import { IconArrowRight, IconBolt, IconCheck, IconLock, IconMail, IconShield } from '@/components/studio/icons';
import { OrderSummary } from './OrderSummary';
import { TestModeBanner } from './TestModeBanner';
import { Emblem, StatusPanel } from './StatusPanel';

/** /studio/checkout/dev — simulated purchase page (no real money; STUDIO_DEV_PURCHASES only). */
export function DevCheckout({ planId, enabled }: { planId: PlanId | null; enabled: boolean }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const { user, setUser, setCredits } = useStudioSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled || !planId) {
    return (
      <div className="py-6 sm:py-12">
        <StatusPanel
          emblem={
            <Emblem tone="neutral">
              <IconLock size={34} />
            </Emblem>
          }
          title={t(!enabled ? 'checkout.dev.disabledTitle' : 'checkout.dev.invalidTitle')}
          glow="none"
        >
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-studio-muted">
            {t(!enabled ? 'checkout.dev.disabledBody' : 'checkout.dev.invalidBody')}
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/studio/pricing" size="lg">
              {t('checkout.dev.seePacks')}
              <IconArrowRight size={18} />
            </ButtonLink>
          </div>
        </StatusPanel>
      </div>
    );
  }

  const plan = getPlan(planId);

  async function simulate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { balance } = await studioApi.devCompletePurchase({ planId: plan.id });
      setCredits(balance);
      // Keep the button busy while we navigate away.
      router.push(`/studio/checkout/success?dev=1&plan=${plan.id}`);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.code === 'unauthorized') {
        setUser(null);
        router.push(`/studio/login?next=${encodeURIComponent(`/studio/checkout/dev?plan=${plan.id}`)}`);
        return;
      }
      setError(te(err instanceof ApiError ? err.code : 'internal'));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TestModeBanner />

      <header className="mt-8 sm:mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-studio-orange">{t('checkout.dev.eyebrow')}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-studio-text sm:text-4xl">
          {t('checkout.dev.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-studio-muted">{t('checkout.dev.subtitle')}</p>
      </header>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        <OrderSummary plan={plan} />

        <Card className="p-5 sm:p-7 lg:sticky lg:top-24">
          <section aria-labelledby="dev-payment-title">
            <div className="flex items-center gap-2.5">
              <IconShield size={20} className="text-studio-amber" />
              <h2 id="dev-payment-title" className="font-display text-lg font-semibold text-studio-text">
                {t('checkout.dev.paymentTitle')}
              </h2>
            </div>

            {user && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-studio-line bg-studio-elevated px-4 py-3">
                <IconMail size={18} className="flex-none text-studio-subtle" />
                <div className="min-w-0 text-sm">
                  <p className="text-xs text-studio-subtle">{t('checkout.dev.accountLabel')}</p>
                  <p className="truncate font-medium text-studio-text" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            <ul className="mt-5 space-y-2.5 text-sm text-studio-muted">
              {(['checkout.dev.point1', 'checkout.dev.point2', 'checkout.dev.point3'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-studio-success/15 text-studio-success">
                    <IconCheck size={13} strokeWidth={3} />
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>

            {error && <Alert className="mt-5">{error}</Alert>}

            <Button size="lg" fullWidth className="mt-6" loading={busy} onClick={simulate}>
              {!busy && <IconBolt size={20} />}
              {t('checkout.dev.simulate')}
            </Button>
            <ButtonLink href="/studio/pricing" variant="ghost" fullWidth className="mt-2">
              {t('checkout.dev.backToPricing')}
            </ButtonLink>
          </section>
        </Card>
      </div>
    </div>
  );
}
