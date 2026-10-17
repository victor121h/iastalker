'use client';

// Branded 404 for the Studio.
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { ButtonLink, LogoMark } from '@/components/studio/ui';
import { IconArrowRight } from '@/components/studio/icons';
import { Container, MarketingShell } from './shared';

export function NotFoundView() {
  const { t } = useI18n();
  const { user } = useStudioSession();

  return (
    <MarketingShell>
      <section aria-labelledby="not-found-title" className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="studio-noise absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[820px] max-w-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,31,75,0.20),transparent)]" />
        </div>
        <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 scale-150 rounded-full bg-studio-red/30 blur-2xl animate-studio-pulse-glow"
            />
            <LogoMark size={56} className="relative animate-studio-float" />
          </div>
          <p
            aria-hidden="true"
            className="studio-gradient-text mt-8 font-display text-[96px] font-extrabold leading-none tracking-tighter sm:text-[140px]"
          >
            404
          </p>
          <h1
            id="not-found-title"
            className="mt-4 max-w-xl font-display text-2xl font-bold tracking-tight text-studio-text sm:text-4xl"
          >
            {t('landing.notFound.title')}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-studio-muted">{t('landing.notFound.body')}</p>
          <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <ButtonLink href="/studio" size="lg">
              {t('landing.notFound.home')}
            </ButtonLink>
            {user ? (
              <ButtonLink href="/studio/chat" variant="secondary" size="lg">
                {t('landing.nav.openStudio')}
                <IconArrowRight size={18} />
              </ButtonLink>
            ) : (
              <ButtonLink href="/studio/pricing" variant="secondary" size="lg">
                {t('common.pricing')}
                <IconArrowRight size={18} />
              </ButtonLink>
            )}
          </div>
        </Container>
      </section>
    </MarketingShell>
  );
}
