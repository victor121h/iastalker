'use client';

// Decorative, illustrative mock of the studio chat for the landing hero: a prompt bubble, a glowing
// "generated" frame (pure SVG art, no photos), credit chips and an "animating" video card.
// Exposed to assistive tech as a single image with a descriptive label.
import { useId } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { GENERATION_COST } from '@/lib/studio/plans';
import { cx } from '@/components/studio/ui';
import { IconCheck, IconFlame, IconImage, IconPaperclip, IconSend, IconVideo } from '@/components/studio/icons';

export function HeroVisual({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div
      role="img"
      aria-label={t('landing.visual.label')}
      className={cx('relative mx-auto w-full max-w-[540px]', className)}
    >
      <div aria-hidden="true" className="relative mb-28 sm:mb-0">
        {/* Ambient fire glow */}
        <div className="pointer-events-none absolute -inset-6 rounded-[48px] bg-[radial-gradient(60%_55%_at_60%_45%,rgba(255,31,75,0.35),transparent_70%)] blur-2xl animate-studio-pulse-glow sm:-inset-10" />

        {/* Chat window */}
        <div className="relative rounded-[28px] border border-white/10 bg-[#120709]/90 p-3 shadow-[0_50px_120px_-40px_rgba(255,31,75,0.55)] backdrop-blur-xl sm:p-4">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-studio-red/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-studio-orange/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-studio-amber/60" />
            </div>
            <span className="truncate text-xs font-medium text-studio-muted">{t('landing.visual.title')}</span>
            <span className="inline-flex flex-none items-center gap-1 rounded-full border border-studio-line bg-studio-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-studio-text">
              <IconFlame size={12} className="text-studio-orange" />
              300
            </span>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/[0.04] bg-black/30 p-3 sm:p-4">
            {/* User prompt */}
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md border border-studio-line bg-studio-elevated px-3.5 py-2.5 shadow-lg">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-studio-subtle">
                <span className="h-7 w-7 flex-none rounded-lg bg-[radial-gradient(circle_at_30%_30%,#ffb23f,#ff4a2b_45%,#3a0a14_80%)] ring-1 ring-white/10" />
                <IconPaperclip size={12} />
                <span className="truncate">{t('landing.visual.reference')}</span>
              </div>
              <p className="text-[13px] leading-snug text-studio-text sm:text-sm">{t('landing.visual.prompt')}</p>
            </div>

            {/* Generated image */}
            <div className="studio-glow relative aspect-video overflow-hidden rounded-2xl">
              <SceneArt />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                  <IconImage size={11} />
                  16:9
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-studio-success/20 px-2 py-1 text-[10px] font-semibold text-studio-success backdrop-blur-md">
                  <IconCheck size={11} strokeWidth={3} />
                  {t('landing.visual.ready')}
                </span>
              </div>
            </div>
          </div>

          {/* Composer */}
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-studio-line bg-studio-surface p-1.5">
            <div className="flex flex-none rounded-xl bg-black/40 p-0.5 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-lg studio-gradient-bg px-2 py-1 text-white">
                <IconImage size={12} />
                <span className="hidden min-[400px]:inline">{t('common.image')}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-studio-subtle">
                <IconVideo size={12} />
                <span className="hidden min-[400px]:inline">{t('common.video')}</span>
              </span>
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-studio-subtle">{t('landing.visual.composer')}</span>
            <IconPaperclip size={16} className="flex-none text-studio-subtle" />
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl studio-gradient-bg text-white studio-glow-sm">
              <IconSend size={16} />
            </span>
          </div>
        </div>

        {/* Floating credit chip — image */}
        <div className="absolute -top-6 left-3 flex animate-studio-float items-center gap-2 rounded-2xl studio-glass px-2.5 py-2 shadow-2xl sm:-left-8 sm:top-[52%]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl studio-gradient-bg text-white">
            <IconImage size={16} />
          </span>
          <span className="pr-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-studio-subtle">
              {t('common.image')}
            </span>
            <span className="block text-xs font-bold text-studio-text">
              {t('common.creditsCount', { count: GENERATION_COST.image })}
            </span>
          </span>
        </div>

        {/* Floating video card */}
        <div className="absolute -bottom-28 right-3 w-44 animate-studio-float rounded-2xl studio-glass p-2 shadow-2xl [animation-delay:-3s] sm:-right-8 sm:bottom-[84px] sm:w-52 lg:-right-6">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[radial-gradient(circle_at_62%_58%,#ffd27a_0,#ff8a1f_14%,#ff1f4b_30%,transparent_52%),linear-gradient(180deg,#2a0610_0%,#12040a_70%,#0a0507_100%)]">
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[repeating-linear-gradient(180deg,rgba(10,5,7,0.85)_0_3px,transparent_3px_7px)]" />
            <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            </span>
            <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="studio-shimmer absolute inset-y-0 left-0 w-2/3 rounded-full bg-studio-orange/70" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-0.5 text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1 text-studio-muted">
              <IconVideo size={12} className="flex-none" />
              <span className="truncate">{t('landing.visual.animating')}</span>
            </span>
            <span className="flex-none font-semibold text-studio-amber">
              {t('common.creditsCount', { count: GENERATION_COST.video })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Abstract "neon rooftop at midnight" scene: sunset orb with scanlines, skyline, silk ribbon. */
function SceneArt() {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12030a" />
          <stop offset="45%" stopColor="#3d0818" />
          <stop offset="72%" stopColor="#a3122f" />
          <stop offset="100%" stopColor="#ff4a2b" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffe3a3" />
          <stop offset="35%" stopColor="#ffb23f" />
          <stop offset="70%" stopColor="#ff6a1a" />
          <stop offset="100%" stopColor="#ff1f4b" />
        </radialGradient>
        <linearGradient id={id('silk')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff1f4b" stopOpacity="0" />
          <stop offset="25%" stopColor="#ff1f4b" />
          <stop offset="65%" stopColor="#ff6a1a" />
          <stop offset="100%" stopColor="#ffb23f" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id('haze')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff1f4b" stopOpacity="0" />
          <stop offset="100%" stopColor="#ff1f4b" stopOpacity="0.35" />
        </linearGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={id('sunclip')}>
          <circle cx="318" cy="168" r="78" />
        </clipPath>
      </defs>

      <rect width="480" height="300" fill={url('sky')} />

      {/* Stars */}
      {[
        [34, 28, 1.2],
        [92, 52, 0.9],
        [150, 22, 1.1],
        [212, 64, 0.8],
        [260, 30, 1.3],
        [404, 40, 1],
        [446, 78, 0.8],
        [60, 96, 0.7],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#fff" opacity="0.55" />
      ))}

      {/* Sun glow + sun with scanlines */}
      <circle cx="318" cy="168" r="120" fill={url('sun')} opacity="0.45" filter={url('blur')} />
      <g clipPath={url('sunclip')}>
        <circle cx="318" cy="168" r="78" fill={url('sun')} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="230" y={172 + i * 13} width="180" height={2 + i * 1.4} fill="#5a0b1f" opacity="0.9" />
        ))}
      </g>

      {/* Silk ribbon drifting across the scene */}
      <path
        d="M-30 150 C 60 90, 130 200, 220 132 S 380 70, 510 118"
        fill="none"
        stroke={url('silk')}
        strokeWidth="22"
        strokeLinecap="round"
        opacity="0.55"
        filter={url('soft')}
      />
      <path
        d="M-30 150 C 60 90, 130 200, 220 132 S 380 70, 510 118"
        fill="none"
        stroke={url('silk')}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M-20 158 C 70 104, 140 206, 226 142 S 386 84, 510 128"
        fill="none"
        stroke="#ffd27a"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />

      {/* Skyline */}
      <path
        d="M0 300 V214 H26 V196 H48 V224 H70 V178 H96 V206 H118 V188 H132 V230 H160 V200 H186 V172 H200 V160 H214 V172 H228 V214 H252 V196 H276 V232 H480 V300 Z"
        fill="#0d0306"
      />
      <path d="M380 300 V206 H404 V188 H430 V214 H452 V196 H480 V300 Z" fill="#0d0306" />
      {/* Lit windows */}
      {[
        [78, 190],
        [84, 204],
        [190, 184],
        [204, 172],
        [36, 206],
        [412, 200],
        [440, 222],
        [164, 212],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="5" rx="1" fill="#ffb23f" opacity="0.8" />
      ))}

      {/* Neon sign */}
      <rect
        x="189"
        y="196"
        width="36"
        height="10"
        rx="5"
        fill="none"
        stroke="#ff1f4b"
        strokeWidth="2.5"
        filter={url('soft')}
      />
      <rect x="189" y="196" width="36" height="10" rx="5" fill="none" stroke="#ff8aa0" strokeWidth="1" />

      {/* Rooftop railing in the foreground */}
      <rect x="0" y="262" width="480" height="38" fill="#070204" />
      <rect x="0" y="260" width="480" height="3" fill="#ff4a2b" opacity="0.5" />
      {[20, 70, 120, 170, 220, 270, 320, 370, 420, 470].map((x) => (
        <rect key={x} x={x} y="246" width="3" height="16" fill="#1a0609" />
      ))}
      <rect x="0" y="244" width="480" height="3" fill="#1f070b" />

      <rect width="480" height="300" fill={url('haze')} />
    </svg>
  );
}
