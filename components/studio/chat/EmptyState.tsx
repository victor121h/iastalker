'use client';

// First screen of a new conversation: headline, the two modes with their cost (and how many the
// balance covers), tasteful prompt ideas that fill the composer, and the demo-mode notice.
import { motion } from 'framer-motion';
import {
  GENERATION_COST,
  VIDEO_DURATION_SECONDS,
  generationsFor,
  type AspectRatio,
  type GenerationType,
} from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { Alert, LogoMark, cx } from '@/components/studio/ui';
import { IconArrowRight, IconFlame, IconImage, IconVideo } from '@/components/studio/icons';
import { RatioShape } from './RatioShape';

export interface Suggestion {
  id: 'rooftop' | 'gown' | 'neon' | 'velvet' | 'embers' | 'penthouse';
  ratio: AspectRatio;
  /** Decorative swatch for the card. */
  swatch: string;
}

export const SUGGESTIONS: Suggestion[] = [
  { id: 'rooftop', ratio: '9:16', swatch: 'linear-gradient(135deg,#ff1f4b 0%,#3a0a18 70%)' },
  { id: 'gown', ratio: '9:16', swatch: 'linear-gradient(135deg,#f5c451 0%,#0f5c4a 85%)' },
  { id: 'neon', ratio: '16:9', swatch: 'linear-gradient(135deg,#ff2bd6 0%,#ff6a1a 55%,#140712 100%)' },
  { id: 'velvet', ratio: '1:1', swatch: 'linear-gradient(135deg,#c8102e 0%,#120709 80%)' },
  { id: 'embers', ratio: '9:16', swatch: 'linear-gradient(135deg,#ff8a1f 0%,#ff1f4b 45%,#1a0a0d 100%)' },
  { id: 'penthouse', ratio: '16:9', swatch: 'linear-gradient(135deg,#ffb23f 0%,#4a1a0c 60%,#0a0507 100%)' },
];

function suggestionKey(id: Suggestion['id'], field: 'tag' | 'title' | 'prompt'): MessageKey {
  return `chat.suggestions.${id}.${field}` as MessageKey;
}

export function EmptyState({
  mode,
  onModeChange,
  onPickSuggestion,
}: {
  mode: GenerationType;
  onModeChange: (mode: GenerationType) => void;
  onPickSuggestion: (prompt: string, ratio: AspectRatio) => void;
}) {
  const { t } = useI18n();
  const { user, config } = useStudioSession();
  const credits = user?.credits ?? 0;

  const modes: Array<{ type: GenerationType; icon: JSX.Element; desc: string }> = [
    { type: 'image', icon: <IconImage size={20} />, desc: t('chat.empty.imageDesc') },
    { type: 'video', icon: <IconVideo size={20} />, desc: t('chat.empty.videoDesc', { seconds: VIDEO_DURATION_SECONDS }) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex w-full max-w-3xl flex-col items-center px-1 pb-6 pt-6 text-center sm:pt-12"
    >
      <div className="relative isolate">
        <div aria-hidden="true" className="absolute inset-0 -z-10 scale-150 rounded-full bg-studio-red/30 blur-3xl animate-studio-pulse-glow" />
        <LogoMark size={56} className="animate-studio-float" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-studio-orange">{t('chat.empty.eyebrow')}</p>
      <h2 className="mt-2 max-w-xl font-display text-[28px] font-bold leading-tight tracking-tight text-studio-text sm:text-4xl">
        {t('chat.empty.title')}
      </h2>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-studio-muted">{t('chat.empty.subtitle')}</p>

      {config.aiProvider === 'mock' && (
        <Alert variant="info" className="mt-5 max-w-lg text-left">
          {t('common.demoMode')}
        </Alert>
      )}

      {/* Modes */}
      <div className="mt-7 grid w-full max-w-xl grid-cols-2 gap-3" role="group" aria-label={t('chat.composer.mode')}>
        {modes.map((m) => {
          const active = mode === m.type;
          const label = m.type === 'video' ? t('common.video') : t('common.image');
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => onModeChange(m.type)}
              aria-pressed={active}
              aria-label={`${t('chat.empty.selectMode', { mode: label })} — ${t('common.creditsCount', { count: GENERATION_COST[m.type] })}`}
              className={cx(
                'relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all sm:p-4',
                active
                  ? 'studio-gradient-border border-transparent bg-studio-red/[0.07] shadow-[0_12px_40px_-20px_rgba(255,74,43,0.9)]'
                  : 'border-studio-line bg-studio-surface/70 hover:border-studio-red/40',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    active ? 'studio-gradient-bg text-white' : 'bg-white/5 text-studio-orange',
                  )}
                >
                  {m.icon}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-xs font-semibold text-studio-text">
                  <IconFlame size={12} className="text-studio-orange" />
                  {GENERATION_COST[m.type]}
                </span>
              </span>
              <span className="font-display text-base font-semibold text-studio-text">{label}</span>
              <span className="text-xs leading-snug text-studio-muted sm:text-sm">{m.desc}</span>
              <span className="text-[11px] font-medium text-studio-subtle">
                {t('chat.empty.afford', { count: generationsFor(credits, m.type) })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Suggestions */}
      <div className="mt-9 w-full text-left">
        <h3 className="mb-3 text-center text-sm font-medium text-studio-muted">{t('chat.empty.suggestionsTitle')}</h3>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTIONS.map((s, i) => {
            const title = t(suggestionKey(s.id, 'title'));
            const prompt = t(suggestionKey(s.id, 'prompt'));
            return (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 + i * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => onPickSuggestion(prompt, s.ratio)}
                  aria-label={t('chat.empty.useSuggestion', { title })}
                  className="group flex h-full w-full items-start gap-3 rounded-2xl border border-studio-line bg-studio-surface/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-studio-red/40 hover:bg-studio-elevated"
                >
                  <span
                    aria-hidden="true"
                    className="relative h-14 w-11 flex-none overflow-hidden rounded-xl border border-white/10"
                    style={{ background: s.swatch }}
                  >
                    <span className="absolute bottom-1 right-1 text-white/80">
                      <RatioShape ratio={s.ratio} size={10} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-studio-orange">
                      {t(suggestionKey(s.id, 'tag'))}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-studio-text">
                      {title}
                      <IconArrowRight
                        size={14}
                        className="-translate-x-1 text-studio-orange opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-studio-subtle">{prompt}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
