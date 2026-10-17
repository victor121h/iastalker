'use client';

import { useId, type CSSProperties } from 'react';
import { GENERATION_COST, VIDEO_DURATION_SECONDS } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { Badge, cx } from '@/components/studio/ui';
import { IconCheck, IconImage, IconSparkles, IconUser, IconVideo } from '@/components/studio/icons';

/**
 * Right-hand panel of the auth split screen (desktop only): fire-gradient atmosphere, glass
 * "preview" cards hinting at image & video creation, the tagline and the credit costs.
 * The mock-ups are decorative (aria-hidden); the tagline and costs are real content.
 */
export function AuthVisual({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <aside className={cx('sticky top-0 hidden h-[100dvh] p-4 lg:block', className)}>
      <div className="studio-noise relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0d0609] p-10 xl:p-12">
        <Atmosphere />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <Badge variant="outline" className="bg-black/20 backdrop-blur">
            <IconSparkles size={13} />
            {t('auth.visual.eyebrow')}
          </Badge>
          <Badge variant="neutral" className="bg-black/30 backdrop-blur">
            {t('common.adultsOnly')}
          </Badge>
        </div>

        <div className="relative z-10 my-8 min-h-0 flex-1 [@media(max-height:760px)]:hidden" aria-hidden="true">
          <PreviewStack />
        </div>

        <div className="relative z-10 mt-auto">
          <h2 className="font-display text-[40px] font-bold leading-[1.04] tracking-tight text-studio-text xl:text-[52px]">
            {t('auth.visual.titleA')}
            <br />
            <span className="studio-gradient-text">{t('auth.visual.titleB')}</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-studio-muted">{t('auth.visual.subtitle')}</p>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-studio-subtle">
            {t('auth.visual.costsLabel')}
          </p>
          <ul className="mt-3 flex flex-wrap gap-3">
            <CostChip icon={<IconImage size={18} />} label={t('common.image')} credits={GENERATION_COST.image} />
            <CostChip icon={<IconVideo size={18} />} label={t('common.video')} credits={GENERATION_COST.video} />
          </ul>
          <p className="mt-3 text-xs text-studio-subtle">{t('auth.visual.payPerCreation')}</p>
        </div>
      </div>
    </aside>
  );
}

function CostChip({ icon, label, credits }: { icon: React.ReactNode; label: string; credits: number }) {
  const { t } = useI18n();
  return (
    <li className="studio-glass flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-studio-fire-soft text-studio-orange ring-1 ring-inset ring-studio-red/25">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-studio-text">{label}</span>
        <span className="block text-xs tabular-nums text-studio-muted">{t('common.creditsCount', { count: credits })}</span>
      </span>
    </li>
  );
}

function Atmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -right-40 -top-48 h-[36rem] w-[36rem] rounded-full bg-studio-red/30 blur-[110px] animate-studio-pulse-glow" />
      <div className="absolute -bottom-56 -left-32 h-[38rem] w-[38rem] rounded-full bg-studio-orange/20 blur-[120px]" />
      <div
        className="absolute left-[28%] top-[34%] h-72 w-72 rounded-full bg-studio-crimson/30 blur-[90px] animate-studio-pulse-glow"
        style={{ animationDelay: '1.2s' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0d0609] via-[#0d0609]/70 to-transparent" />
    </div>
  );
}

const float = (delay: string): CSSProperties => ({ animationDelay: delay });

/** Layered mock-up: a prompt bubble, the finished image and a video that is rendering. */
function PreviewStack() {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto h-full w-full max-w-[560px]">
      {/* Finished image */}
      <div className="absolute right-0 top-[5%] z-0 aspect-[4/5] h-[82%] max-w-[64%] animate-studio-float" style={float('0s')}>
        <div className="studio-glow relative h-full w-full rotate-[2.5deg] overflow-hidden rounded-[26px] border border-white/10">
          <ImageArt />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-studio-text">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-studio-success/20 text-studio-success">
                <IconCheck size={11} strokeWidth={3} />
              </span>
              {t('auth.visual.imageReady')}
            </span>
            <span className="text-[11px] tabular-nums text-studio-muted">
              {GENERATION_COST.image} {t('common.creditsShort')}
            </span>
          </div>
        </div>
      </div>

      {/* Prompt bubble */}
      <div className="absolute left-0 top-0 z-20 w-[60%] max-w-[300px] animate-studio-float" style={float('-2s')}>
        <div className="studio-glass rounded-2xl rounded-tl-md p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-studio-muted">
              <IconUser size={14} />
            </span>
            <span className="text-xs font-semibold text-studio-muted">{t('auth.visual.you')}</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-studio-red/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-studio-orange">
              <IconImage size={11} />
              {t('common.image')}
            </span>
          </div>
          <p className="mt-2.5 line-clamp-3 text-[13px] leading-snug text-studio-text">{t('auth.visual.prompt')}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-7 w-7 flex-none rounded-md bg-[linear-gradient(140deg,#3a0a14,#a3241c_60%,#ff8a1f)] ring-1 ring-white/15" />
            <span className="text-[11px] text-studio-subtle">{t('auth.visual.reference')}</span>
          </div>
        </div>
      </div>

      {/* Video rendering */}
      <div className="absolute bottom-[3%] left-[3%] z-10 aspect-video w-[62%] max-w-[340px] animate-studio-float" style={float('-4s')}>
        <div className="relative h-full w-full -rotate-[3deg] overflow-hidden rounded-[22px] border border-white/10 shadow-[0_30px_70px_-25px_rgba(255,31,75,0.55)]">
          <VideoArt />
          <div className="absolute left-1/2 top-[42%] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="#fff" />
            </svg>
          </div>
          <div className="absolute inset-x-3 bottom-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-studio-text/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-studio-orange animate-studio-pulse-glow" />
                <IconVideo size={11} />
                {t('auth.visual.videoRendering')}
              </span>
              <span className="tabular-nums text-studio-muted">{VIDEO_DURATION_SECONDS}s</span>
            </div>
            <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
              <div className="studio-gradient-bg absolute inset-y-0 left-0 w-[62%] rounded-full" />
              <div className="studio-shimmer absolute inset-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useSvgIds() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Abstract "silk & smoke at golden hour" artwork for the image preview. */
function ImageArt() {
  const p = useSvgIds();
  const url = (name: string) => `url(#${p}-${name})`;
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${p}-bg`} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#170307" />
          <stop offset="0.5" stopColor="#4a0a17" />
          <stop offset="1" stopColor="#8f1d18" />
        </linearGradient>
        <radialGradient id={`${p}-sun`} cx="0.68" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#FFC46B" stopOpacity="0.95" />
          <stop offset="0.32" stopColor="#FF6A1A" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FF1F4B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-silkA`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#FF1F4B" />
          <stop offset="0.55" stopColor="#FF4A2B" />
          <stop offset="1" stopColor="#FF8A1F" />
        </linearGradient>
        <linearGradient id={`${p}-silkB`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c0a1b" />
          <stop offset="1" stopColor="#C8102E" />
        </linearGradient>
        <radialGradient id={`${p}-vig`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <filter id={`${p}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <rect width="400" height="500" fill={url('bg')} />
      <circle cx="272" cy="150" r="240" fill={url('sun')} />
      <g filter={url('soft')}>
        <ellipse cx="110" cy="200" rx="100" ry="38" fill="#FFB07A" opacity="0.18" />
        <ellipse cx="300" cy="262" rx="130" ry="32" fill="#FF8A5C" opacity="0.2" />
        <ellipse cx="200" cy="120" rx="70" ry="22" fill="#FFD9B0" opacity="0.12" />
      </g>
      <path
        d="M-10 330 C 60 280, 120 300, 170 340 C 220 380, 290 330, 330 290 C 360 262, 390 262, 410 270 L 410 510 L -10 510 Z"
        fill={url('silkA')}
        opacity="0.92"
      />
      <path d="M-10 380 C 70 340, 140 380, 210 420 C 270 452, 340 400, 410 370 L 410 510 L -10 510 Z" fill={url('silkB')} />
      <path
        d="M-10 440 C 90 410, 180 470, 260 460 C 330 452, 370 430, 410 420 L 410 510 L -10 510 Z"
        fill="#2a0610"
        opacity="0.88"
      />
      <path
        d="M-6 328 C 62 279, 122 299, 172 338 C 222 378, 290 328, 332 288"
        stroke="#FFD9B0"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M-6 378 C 72 338, 142 378, 212 418" stroke="#FFB23F" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
      <circle cx="70" cy="90" r="5" fill="#FFD9B0" opacity="0.5" />
      <circle cx="120" cy="58" r="2.5" fill="#FFD9B0" opacity="0.6" />
      <circle cx="345" cy="70" r="3.5" fill="#FFD9B0" opacity="0.45" />
      <circle cx="58" cy="232" r="3" fill="#FFB23F" opacity="0.35" />
      <circle cx="362" cy="212" r="8" fill="#FFB23F" opacity="0.16" />
      <rect width="400" height="500" fill={url('vig')} />
    </svg>
  );
}

/** Abstract ember / light-streak frame for the video preview. */
function VideoArt() {
  const p = useSvgIds();
  const url = (name: string) => `url(#${p}-${name})`;
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${p}-bg`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#100208" />
          <stop offset="0.55" stopColor="#3d0712" />
          <stop offset="1" stopColor="#7a1a10" />
        </linearGradient>
        <radialGradient id={`${p}-glow`} cx="0.62" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#FF8A1F" stopOpacity="0.85" />
          <stop offset="0.4" stopColor="#FF1F4B" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FF1F4B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-streak`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFB23F" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFD9B0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FF4A2B" stopOpacity="0" />
        </linearGradient>
        <filter id={`${p}-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect width="320" height="180" fill={url('bg')} />
      <ellipse cx="200" cy="112" rx="190" ry="110" fill={url('glow')} />
      <g filter={url('blur')} transform="rotate(-14 160 90)">
        <rect x="-20" y="70" width="360" height="5" rx="2.5" fill={url('streak')} />
        <rect x="40" y="104" width="280" height="3" rx="1.5" fill={url('streak')} opacity="0.7" />
      </g>
      <path d="M0 150 C 70 128, 140 160, 210 142 S 300 120, 320 128 L 320 180 L 0 180 Z" fill="#1a0308" opacity="0.85" />
      <circle cx="58" cy="44" r="2" fill="#FFD9B0" opacity="0.7" />
      <circle cx="96" cy="30" r="1.4" fill="#FFB23F" opacity="0.8" />
      <circle cx="248" cy="36" r="2.4" fill="#FFD9B0" opacity="0.55" />
      <circle cx="282" cy="62" r="1.6" fill="#FFB23F" opacity="0.7" />
      <circle cx="140" cy="58" r="1.2" fill="#FFD9B0" opacity="0.6" />
    </svg>
  );
}
