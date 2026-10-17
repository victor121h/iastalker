'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import {
  GENERATION_COST,
  PLANS,
  VIDEO_DURATION_SECONDS,
  centsPerCredit,
  costPerGenerationCents,
  formatUSD,
} from '@/lib/studio/plans';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { PricingCards } from '@/components/studio/PricingCards';
import { ButtonLink, LogoMark, cx } from '@/components/studio/ui';
import {
  IconArrowRight,
  IconAspect,
  IconBolt,
  IconChat,
  IconFlame,
  IconLock,
  IconPaperclip,
  IconSparkles,
  IconVideo,
  IconWand,
} from '@/components/studio/icons';
import { Faq, type FaqItem } from './Faq';
import { Container, MailLink, Reveal, SectionHeading } from './shared';

// ── How it works ─────────────────────────────────────────────────────────────────────────────
const STEPS: Array<{ title: MessageKey; body: MessageKey; icon: ReactNode }> = [
  { title: 'landing.how.s1.title', body: 'landing.how.s1.body', icon: <IconAspect size={22} /> },
  { title: 'landing.how.s2.title', body: 'landing.how.s2.body', icon: <IconChat size={22} /> },
  { title: 'landing.how.s3.title', body: 'landing.how.s3.body', icon: <IconWand size={22} /> },
];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="how-title" className="relative py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading id="how-title" eyebrow={t('landing.how.eyebrow')} title={t('landing.how.title')} />
        </Reveal>
        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[16%] top-[52px] hidden h-px bg-gradient-to-r from-transparent via-studio-red/50 to-transparent md:block"
          />
          <ol className="relative grid gap-5 md:grid-cols-3 lg:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <Reveal delay={i * 0.08} className="h-full">
                  <div className="relative h-full rounded-3xl border border-studio-line bg-studio-surface/70 p-6 transition-colors hover:border-studio-red/30 sm:p-7">
                    <div className="flex items-center justify-between">
                      <span className="studio-glow-sm flex h-12 w-12 items-center justify-center rounded-2xl studio-gradient-bg text-white">
                        {step.icon}
                      </span>
                      <span
                        aria-hidden="true"
                        className="font-display text-5xl font-extrabold tabular-nums text-white/[0.06]"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-studio-orange">
                      {t('landing.how.step', { n: i + 1 })}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold text-studio-text">{t(step.title)}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-studio-muted">{t(step.body)}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────────────────────
const FEATURES: Array<{ title: MessageKey; body: MessageKey; icon: ReactNode }> = [
  { title: 'landing.features.media.title', body: 'landing.features.media.body', icon: <IconVideo size={22} /> },
  {
    title: 'landing.features.reference.title',
    body: 'landing.features.reference.body',
    icon: <IconPaperclip size={22} />,
  },
  { title: 'landing.features.animate.title', body: 'landing.features.animate.body', icon: <IconSparkles size={22} /> },
  { title: 'landing.features.history.title', body: 'landing.features.history.body', icon: <IconLock size={22} /> },
  { title: 'landing.features.expiry.title', body: 'landing.features.expiry.body', icon: <IconFlame size={22} /> },
  { title: 'landing.features.once.title', body: 'landing.features.once.body', icon: <IconBolt size={22} /> },
];

export function Features() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="features-title" className="relative py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 mx-auto h-[420px] max-w-4xl rounded-full bg-[radial-gradient(closest-side,rgba(255,31,75,0.10),transparent)]"
      />
      <Container>
        <Reveal>
          <SectionHeading
            id="features-title"
            eyebrow={t('landing.features.eyebrow')}
            title={t('landing.features.title')}
            subtitle={t('landing.features.subtitle')}
          />
        </Reveal>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-3xl border border-studio-line bg-studio-surface/60 p-6 transition-colors hover:border-studio-red/30 sm:p-7">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-studio-red/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-studio-red/30 bg-studio-fire-soft text-studio-orange">
                    {f.icon}
                  </span>
                  <h3 className="relative mt-5 font-display text-lg font-bold text-studio-text">{t(f.title)}</h3>
                  <p className="relative mt-2 text-[15px] leading-relaxed text-studio-muted">
                    {t(f.body, { seconds: VIDEO_DURATION_SECONDS })}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ── Styles showcase (abstract CSS swatches — not generated samples) ──────────────────────────
interface StyleTile {
  id: string;
  name: MessageKey;
  hint: MessageKey;
  art: string;
  deco?: ReactNode;
}

const STYLE_TILES: StyleTile[] = [
  {
    id: 'cinematic',
    name: 'landing.styles.cinematic',
    hint: 'landing.styles.cinematic.hint',
    art: 'bg-[radial-gradient(ellipse_60%_45%_at_68%_45%,rgba(255,178,63,0.85),rgba(255,106,26,0.35)_40%,transparent_70%),linear-gradient(180deg,#1b0d08_0%,#3d1b0c_55%,#0b0504_100%)]',
    deco: (
      <>
        <div className="absolute inset-x-0 bottom-[30%] h-px bg-gradient-to-r from-transparent via-studio-amber/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[11%] bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-[11%] bg-black" />
      </>
    ),
  },
  {
    id: 'neon',
    name: 'landing.styles.neon',
    hint: 'landing.styles.neon.hint',
    art: 'bg-[radial-gradient(circle_at_28%_72%,rgba(255,31,75,0.6),transparent_45%),radial-gradient(circle_at_78%_22%,rgba(200,40,255,0.45),transparent_42%),linear-gradient(160deg,#0b0512,#1a0718_60%,#07030a)]',
    deco: (
      <>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_26px,rgba(255,31,75,0.22)_26px_28px)] [mask-image:linear-gradient(180deg,transparent,#000_45%,transparent)]" />
        <div className="absolute left-[18%] right-[38%] top-[34%] h-1.5 rounded-full bg-[#ff4d7a] shadow-[0_0_18px_4px_rgba(255,31,75,0.8)]" />
        <div className="absolute left-[44%] right-[16%] top-[46%] h-1 rounded-full bg-[#e07bff] shadow-[0_0_16px_3px_rgba(200,40,255,0.7)]" />
      </>
    ),
  },
  {
    id: 'editorial',
    name: 'landing.styles.editorial',
    hint: 'landing.styles.editorial.hint',
    art: 'bg-[radial-gradient(circle_at_50%_36%,#f6e1d6_0,#e7b3a3_20%,transparent_44%),linear-gradient(170deg,#e9c7bb_0%,#b9545f_55%,#3a0f18_100%)]',
    deco: (
      <>
        <div className="absolute inset-[7%] rounded-2xl border border-white/30" />
        <div className="absolute left-[12%] top-[11%] h-1 w-10 rounded-full bg-[#3a0f18]/60" />
        <div className="absolute left-[12%] top-[15%] h-1 w-16 rounded-full bg-[#3a0f18]/35" />
      </>
    ),
  },
  {
    id: 'fantasy',
    name: 'landing.styles.fantasy',
    hint: 'landing.styles.fantasy.hint',
    art: 'bg-[radial-gradient(ellipse_80%_50%_at_50%_105%,#ffb23f,rgba(255,74,43,0.6)_35%,transparent_65%),linear-gradient(180deg,#1d0627_0%,#5a1033_45%,#a8213a_75%,#ff6a1a_100%)]',
    deco: (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_20%_18%,#fff,transparent),radial-gradient(1px_1px_at_62%_10%,#fff,transparent),radial-gradient(1.5px_1.5px_at_82%_26%,#fff,transparent),radial-gradient(1px_1px_at_38%_30%,#fff,transparent),radial-gradient(1px_1px_at_12%_40%,#fff,transparent)] opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#1a0610] [clip-path:polygon(0_60%,14%_30%,26%_52%,40%_8%,54%_44%,66%_22%,80%_50%,92%_28%,100%_46%,100%_100%,0_100%)]" />
      </>
    ),
  },
  {
    id: 'anime',
    name: 'landing.styles.anime',
    hint: 'landing.styles.anime.hint',
    art: 'bg-[linear-gradient(180deg,#ff3f6c_0%,#ff7a45_45%,#ffc46b_78%,#ffe2a3_100%)]',
    deco: (
      <>
        <div className="absolute left-1/2 top-[30%] h-[34%] w-[42%] -translate-x-1/2 rounded-full bg-[#fff3d1] shadow-[0_0_0_10px_rgba(255,243,209,0.25)]" />
        <div className="absolute bottom-[26%] left-[-8%] h-[16%] w-[60%] rounded-full bg-white/85 shadow-[inset_0_-8px_0_rgba(255,122,69,0.35)]" />
        <div className="absolute bottom-[34%] right-[-10%] h-[13%] w-[50%] rounded-full bg-white/75 shadow-[inset_0_-6px_0_rgba(255,122,69,0.3)]" />
        <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[#4a1030]" />
      </>
    ),
  },
  {
    id: 'product',
    name: 'landing.styles.product',
    hint: 'landing.styles.product.hint',
    art: 'bg-[radial-gradient(ellipse_70%_40%_at_50%_28%,rgba(255,255,255,0.20),transparent_60%),linear-gradient(180deg,#1f0d12_0%,#0a0507_100%)]',
    deco: (
      <>
        <div className="absolute bottom-[30%] left-1/2 h-[42%] w-[26%] -translate-x-1/2 rounded-[40%_40%_18%_18%/22%_22%_10%_10%] bg-[linear-gradient(100deg,#7a0f24_0%,#ff1f4b_38%,#ff9a6b_50%,#ff1f4b_62%,#5a0a1a_100%)] shadow-[0_20px_40px_-10px_rgba(255,31,75,0.6)]" />
        <div className="absolute bottom-[71%] left-1/2 h-[7%] w-[12%] -translate-x-1/2 rounded-t-md bg-[linear-gradient(90deg,#b78a3c,#f5c451,#b78a3c)]" />
        <div className="absolute bottom-[25%] left-1/2 h-[6%] w-[44%] -translate-x-1/2 rounded-[50%] bg-studio-red/30 blur-md" />
      </>
    ),
  },
];

export function StylesShowcase() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="styles-title" className="relative py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            id="styles-title"
            eyebrow={t('landing.styles.eyebrow')}
            title={t('landing.styles.title')}
            subtitle={t('landing.styles.subtitle')}
          />
        </Reveal>
        <ul className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5">
          {STYLE_TILES.map((tile, i) => (
            <li key={tile.id}>
              <Reveal delay={(i % 3) * 0.06}>
                <figure className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 md:aspect-[4/3]">
                  <div
                    aria-hidden="true"
                    className={cx(
                      'absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]',
                      tile.art,
                    )}
                  >
                    {tile.deco}
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <span className="block font-display text-lg font-bold text-white sm:text-xl">{t(tile.name)}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-white/70 sm:text-[13px]">
                      <span className="sr-only">{t('landing.styles.hintLabel')}: </span>“{t(tile.hint)}”
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────────────────────
export function PricingSection() {
  const { t } = useI18n();
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="relative scroll-mt-20 py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[560px] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgba(255,74,43,0.14),transparent)]"
      />
      <Container>
        <Reveal>
          <SectionHeading
            id="pricing-title"
            eyebrow={t('landing.pricing.eyebrow')}
            title={t('landing.pricing.title')}
            subtitle={t('landing.pricing.subtitle')}
          />
        </Reveal>
        <PricingCards variant="page" className="mt-16" />
        <p className="mt-8 text-center">
          <Link
            href="/studio/pricing"
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-studio-orange transition-colors hover:text-studio-amber"
          >
            {t('landing.pricing.compare')}
            <IconArrowRight size={16} />
          </Link>
        </p>
      </Container>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────────────────────
export function LandingFaq() {
  const { t } = useI18n();
  // Cheapest per-credit plan, for the "as little as" answer.
  const best = PLANS.reduce((a, b) => (centsPerCredit(b) < centsPerCredit(a) ? b : a));

  const items: FaqItem[] = [
    { id: 'credits', question: t('landing.faq.credits.q'), answer: <p>{t('landing.faq.credits.a')}</p> },
    {
      id: 'cost',
      question: t('landing.faq.cost.q'),
      answer: (
        <p>
          {t('landing.faq.cost.a', {
            image: GENERATION_COST.image,
            video: GENERATION_COST.video,
            seconds: VIDEO_DURATION_SECONDS,
            plan: best.name,
            imagePrice: formatUSD(costPerGenerationCents(best, 'image')),
            videoPrice: formatUSD(costPerGenerationCents(best, 'video')),
          })}
        </p>
      ),
    },
    { id: 'expiry', question: t('landing.faq.expiry.q'), answer: <p>{t('landing.faq.expiry.a')}</p> },
    { id: 'reference', question: t('landing.faq.reference.q'), answer: <p>{t('landing.faq.reference.a')}</p> },
    {
      id: 'policy',
      question: t('landing.faq.policy.q'),
      answer: (
        <>
          <p>{t('landing.faq.policy.a')}</p>
          <p className="mt-3">
            <Link
              href="/studio/terms#content-policy"
              className="inline-flex items-center gap-1.5 rounded font-semibold text-studio-orange transition-colors hover:text-studio-amber"
            >
              {t('landing.faq.readPolicy')}
              <IconArrowRight size={15} />
            </Link>
          </p>
        </>
      ),
    },
    { id: 'payment', question: t('landing.faq.payment.q'), answer: <p>{t('landing.faq.payment.a')}</p> },
    { id: 'failed', question: t('landing.faq.failed.q'), answer: <p>{t('landing.faq.failed.a')}</p> },
    { id: 'privacy', question: t('landing.faq.privacy.q'), answer: <p>{t('landing.faq.privacy.a')}</p> },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative scroll-mt-20 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16">
        <Reveal className="self-start lg:sticky lg:top-28">
          <SectionHeading
            id="faq-title"
            eyebrow={t('landing.faq.eyebrow')}
            title={t('landing.faq.title')}
            align="left"
          />
          <p className="mt-5 text-[15px] leading-relaxed text-studio-muted">
            {t('landing.faq.more')} <MailLink />
          </p>
        </Reveal>
        <Faq items={items} defaultOpen="credits" />
      </Container>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────────────────────
export function FinalCta() {
  const { t } = useI18n();
  const { user, config } = useStudioSession();
  const subtitle = user
    ? t('landing.cta.subtitleUser')
    : config.signupBonus > 0
      ? t('landing.cta.subtitleBonus', { count: config.signupBonus })
      : t('landing.cta.subtitle');

  return (
    <section aria-labelledby="cta-title" className="relative pb-24 pt-8 sm:pb-32">
      <Container>
        <Reveal>
          <div className="studio-gradient-border studio-noise relative overflow-hidden rounded-[32px] bg-[#150a0d] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-40 left-1/2 h-80 w-[46rem] max-w-[140%] -translate-x-1/2 rounded-full bg-studio-red/25 blur-3xl" />
              <div className="absolute -top-24 right-[-6rem] h-64 w-64 rounded-full bg-studio-orange/15 blur-3xl" />
            </div>
            <div className="relative">
              <div className="relative mx-auto w-fit">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-150 rounded-full bg-studio-red/30 blur-2xl animate-studio-pulse-glow"
                />
                <LogoMark size={60} className="relative animate-studio-float" />
              </div>
              <h2
                id="cta-title"
                className="mx-auto mt-8 max-w-2xl text-balance font-display text-[32px] font-extrabold leading-[1.08] tracking-tight text-studio-text sm:text-5xl"
              >
                {t('landing.cta.title')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-studio-muted sm:text-lg">{subtitle}</p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                {user ? (
                  <ButtonLink href="/studio/chat" size="lg">
                    {t('landing.hero.ctaOpen')}
                    <IconArrowRight size={20} />
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/studio/signup" size="lg">
                    {t('common.startCreating')}
                    <IconArrowRight size={20} />
                  </ButtonLink>
                )}
                <ButtonLink href="/studio/pricing" variant="secondary" size="lg">
                  {t('landing.hero.ctaPricing')}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
