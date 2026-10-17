'use client';

import { useI18n } from '@/lib/studio/i18n/client';
import { GENERATION_COST, VIDEO_DURATION_SECONDS } from '@/lib/studio/plans';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { ButtonLink } from '@/components/studio/ui';
import { IconArrowRight, IconCheck, IconImage, IconShield, IconSparkles, IconVideo } from '@/components/studio/icons';
import { formatCount } from './format';
import { HeroVisual } from './HeroVisual';

export function Hero() {
  const { t, lang } = useI18n();
  const { user, config } = useStudioSession();
  const bonus = config.signupBonus;

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Background fire glows + faint grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="studio-noise absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] max-w-[160%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,31,75,0.22),transparent)]" />
        <div className="absolute -right-40 top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,31,0.16),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-studio-red/30 bg-studio-red/[0.08] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffb3c0]">
            <IconShield size={14} />
            {t('landing.hero.eyebrow')}
          </p>

          <h1
            id="hero-title"
            className="mt-6 text-balance font-display text-[42px] font-extrabold leading-[1.02] tracking-tight text-studio-text min-[400px]:text-[48px] sm:text-6xl lg:text-[64px] xl:text-[72px]"
          >
            <span className="block">{t('landing.hero.titleA')}</span>
            <span className="studio-gradient-text block pb-1">{t('landing.hero.titleB')}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-studio-muted sm:text-lg lg:mx-0">
            {t('landing.hero.subtitle')}
          </p>

          {user ? (
            <p className="mx-auto mt-5 inline-flex max-w-xl items-center gap-2 rounded-2xl border border-studio-line bg-studio-surface/70 px-4 py-2.5 text-left text-sm text-studio-muted lg:mx-0">
              <IconSparkles size={16} className="flex-none text-studio-orange" />
              <span>
                {t('landing.hero.welcome', {
                  name: user.name || user.email.split('@')[0],
                  count: formatCount(user.credits, lang),
                })}
              </span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            {user ? (
              <ButtonLink href="/studio/chat" size="lg">
                {t('landing.hero.ctaOpen')}
                <IconArrowRight size={20} />
              </ButtonLink>
            ) : (
              <ButtonLink href="/studio/signup" size="lg">
                {t('common.startCreating')}
                {bonus > 0 ? (
                  <span className="hidden rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white sm:inline-flex">
                    {t('landing.hero.bonus', { count: bonus })}
                  </span>
                ) : (
                  <IconArrowRight size={20} />
                )}
              </ButtonLink>
            )}
            <ButtonLink href="#pricing" variant="secondary" size="lg">
              {t('landing.hero.ctaPricing')}
            </ButtonLink>
          </div>

          {!user && bonus > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-studio-muted sm:hidden">
              <IconSparkles size={15} className="text-studio-amber" />
              {t('landing.hero.bonusNote', { count: bonus })}
            </p>
          ) : null}

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-studio-muted lg:justify-start">
            <li className="inline-flex items-center gap-1.5">
              <IconImage size={16} className="text-studio-orange" />
              {t('landing.hero.factImage', { credits: GENERATION_COST.image })}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconVideo size={16} className="text-studio-orange" />
              {t('landing.hero.factVideo', { credits: GENERATION_COST.video, seconds: VIDEO_DURATION_SECONDS })}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconCheck size={16} className="text-studio-orange" />
              {t('landing.hero.factNoSub')}
            </li>
          </ul>
        </div>

        <HeroVisual className="lg:mr-0 lg:max-w-[560px]" />
      </div>
    </section>
  );
}
