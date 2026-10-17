'use client';

// Sticky glass composer: Image/Video toggle with costs, aspect ratio, reference image (button,
// drag & drop and paste are wired by ChatApp), auto-growing prompt and the Generate button.
import { motion } from 'framer-motion';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ASPECT_RATIOS,
  GENERATION_COST,
  MAX_PROMPT_LENGTH,
  VIDEO_DURATION_SECONDS,
  type AspectRatio,
  type GenerationType,
} from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import { Button, Spinner, cx } from '@/components/studio/ui';
import { IconClose, IconFlame, IconImage, IconPaperclip, IconVideo } from '@/components/studio/icons';
import { RatioShape } from './RatioShape';
import { REFERENCE_ACCEPT_ATTR, pickImageFile } from './reference';
import type { ComposerReference } from './types';

const MAX_TEXTAREA_HEIGHT = 6 * 24 + 16; // ~6 lines + vertical padding
const COUNTER_THRESHOLD = MAX_PROMPT_LENGTH - 200;
/** Show the "running low" nudge below this balance (two videos' worth). */
export const LOW_CREDITS_THRESHOLD = GENERATION_COST.video * 2;

const RATIO_LABEL: Record<AspectRatio, MessageKey> = {
  '1:1': 'chat.composer.ratioSquare',
  '9:16': 'chat.composer.ratioPortrait',
  '16:9': 'chat.composer.ratioLandscape',
};

export interface ComposerProps {
  mode: GenerationType;
  onModeChange: (mode: GenerationType) => void;
  ratio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  reference: ComposerReference | null;
  referenceBusy: boolean;
  onRemoveReference: () => void;
  onAttachFile: (file: File) => void;
  submitting: boolean;
  onSubmit: () => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  credits: number;
  onGetCredits: () => void;
}

export function Composer({
  mode,
  onModeChange,
  ratio,
  onRatioChange,
  prompt,
  onPromptChange,
  reference,
  referenceBusy,
  onRemoveReference,
  onAttachFile,
  submitting,
  onSubmit,
  textareaRef,
  credits,
  onGetCredits,
}: ComposerProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const hintId = useId();
  const [coarsePointer, setCoarsePointer] = useState(false);
  const cost = GENERATION_COST[mode];
  const canSend = prompt.trim().length > 0 && !submitting && !referenceBusy;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [prompt, textareaRef]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (canSend) onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    // Touch keyboards have no Shift+Enter: Enter adds a line there (Ctrl/Cmd+Enter still sends).
    if (coarsePointer && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (canSend) onSubmit();
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const file = pickImageFile(e.clipboardData?.files);
    if (!file) return;
    // Copies from office apps carry an image rendering of the text: text wins in that case.
    if (e.clipboardData.getData('text/plain').trim()) return;
    // A pasted screenshot / image: attach it as the reference.
    e.preventDefault();
    e.stopPropagation();
    onAttachFile(file);
  }

  const placeholder =
    mode === 'video'
      ? reference
        ? t('chat.composer.placeholderAnimate')
        : t('chat.composer.placeholderVideo')
      : t('chat.composer.placeholderImage');

  const hint =
    mode === 'video'
      ? reference
        ? t('chat.composer.hintVideoReference', { seconds: VIDEO_DURATION_SECONDS })
        : t('chat.composer.hintVideo', { seconds: VIDEO_DURATION_SECONDS })
      : reference
        ? t('chat.composer.hintReference')
        : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CreditsNudge credits={credits} mode={mode} onGetCredits={onGetCredits} />

      <form
        onSubmit={handleSubmit}
        className="studio-glass rounded-[26px] p-2 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.95)] transition-colors focus-within:border-studio-orange/40 sm:p-2.5"
      >
        {(reference || referenceBusy) && (
          <ReferenceChip reference={reference} busy={referenceBusy} onRemove={onRemoveReference} />
        )}

        <div className="flex flex-wrap items-end gap-2">
          {/* Prompt — first row on ≥ sm, middle of the second row on phones */}
          <div className="relative order-3 min-w-0 flex-1 sm:order-1 sm:basis-full">
            <label htmlFor={textareaId} className="sr-only">
              {t('chat.composer.label')}
            </label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder={placeholder}
              aria-describedby={hint ? hintId : undefined}
              enterKeyHint={coarsePointer ? 'enter' : 'send'}
              className="block max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 text-studio-text placeholder:text-studio-subtle focus-visible:!outline-none sm:px-3 sm:text-[15px]"
            />
            {prompt.length >= COUNTER_THRESHOLD && (
              <span
                className={cx(
                  'pointer-events-none absolute bottom-0.5 right-2 text-[11px] tabular-nums',
                  prompt.length >= MAX_PROMPT_LENGTH ? 'text-studio-red' : 'text-studio-subtle',
                )}
              >
                {t('chat.composer.counter', { count: prompt.length, max: MAX_PROMPT_LENGTH })}
              </span>
            )}
          </div>

          {/* Attach */}
          <div className="order-2 flex-none">
            <input
              ref={fileRef}
              type="file"
              accept={REFERENCE_ACCEPT_ATTR}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAttachFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t('chat.composer.attach')}
              title={t('chat.composer.attach')}
              disabled={referenceBusy}
              className={cx(
                'flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-50',
                reference
                  ? 'border-studio-orange/50 bg-studio-orange/10 text-studio-orange'
                  : 'border-white/10 bg-white/[0.03] text-studio-muted hover:border-studio-red/40 hover:text-studio-text',
              )}
            >
              <IconPaperclip size={18} />
            </button>
          </div>

          {/* Mode + ratio — own row on phones */}
          <div className="order-1 flex w-full flex-wrap items-center gap-2 sm:order-3 sm:w-auto">
            <Segmented<GenerationType>
              label={t('chat.composer.mode')}
              tone="fire"
              value={mode}
              onChange={onModeChange}
              options={(['image', 'video'] as GenerationType[]).map((type) => {
                const name = type === 'video' ? t('common.video') : t('common.image');
                return {
                  value: type,
                  ariaLabel: `${name} · ${t('common.creditsCount', { count: GENERATION_COST[type] })}`,
                  content: (
                    <>
                      <span className="hidden md:inline-flex">
                        {type === 'video' ? <IconVideo size={15} /> : <IconImage size={15} />}
                      </span>
                      <span>{name}</span>
                      <span
                        className={cx(
                          'inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                          mode === type ? 'bg-black/25 text-white' : 'bg-white/5 text-studio-subtle',
                        )}
                      >
                        {GENERATION_COST[type]}
                      </span>
                    </>
                  ),
                };
              })}
            />
            <Segmented<AspectRatio>
              label={t('chat.composer.ratio')}
              tone="neutral"
              value={ratio}
              onChange={onRatioChange}
              options={ASPECT_RATIOS.map((r) => ({
                value: r,
                ariaLabel: t(RATIO_LABEL[r]),
                title: t(RATIO_LABEL[r]),
                content: (
                  <>
                    <RatioShape ratio={r} size={14} />
                    <span className="hidden text-xs md:inline lg:hidden xl:inline">{r}</span>
                  </>
                ),
              }))}
            />
          </div>

          <div className="hidden sm:order-4 sm:block sm:flex-1" aria-hidden="true" />

          {/* Send */}
          <div className="order-4 flex-none sm:order-5">
            <Button
              type="submit"
              size="md"
              disabled={!canSend}
              aria-label={t('chat.composer.generateLabel', { cost })}
              className="h-11 rounded-full !px-3.5 sm:!px-5"
            >
              {submitting ? <Spinner size={16} /> : <IconFlame size={17} />}
              <span className="hidden sm:inline">{t('chat.composer.generate', { cost })}</span>
              <span className="tabular-nums sm:hidden">{cost}</span>
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-1.5 flex min-h-[18px] items-center justify-between gap-3 px-3 text-[11px] text-studio-subtle sm:text-xs">
        <span id={hintId} className={cx(hint && mode === 'video' && 'text-studio-muted')}>
          {hint}
        </span>
        {!coarsePointer && <span className="hidden text-right sm:inline">{t('chat.composer.hintKeys')}</span>}
      </div>
    </div>
  );
}

// ── Segmented control (radio group with arrow-key navigation) ───────────────────────────────

interface SegmentedOption<T extends string> {
  value: T;
  ariaLabel: string;
  title?: string;
  content: ReactNode;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  tone,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  tone: 'fire' | 'neutral';
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const pillId = useId();

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center rounded-full border border-white/10 bg-black/30 p-1">
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            title={o.title}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'relative inline-flex h-8 items-center rounded-full px-2.5 text-[13px] font-medium transition-colors',
              active ? 'text-white' : 'text-studio-muted hover:text-studio-text',
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className={cx(
                  'absolute inset-0 rounded-full',
                  tone === 'fire' ? 'studio-gradient-bg shadow-[0_6px_20px_-8px_rgba(255,31,75,0.8)]' : 'bg-white/[0.12]',
                )}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.content}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Reference chip ───────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ReferenceChip({
  reference,
  busy,
  onRemove,
}: {
  reference: ComposerReference | null;
  busy: boolean;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const sub = busy
    ? t('chat.reference.processing')
    : reference?.kind === 'upload'
      ? `${reference.name} · ${formatBytes(reference.bytes)}`
      : t('chat.reference.fromCreation');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2 flex px-1 pt-1"
    >
      <div className="flex max-w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-black/30 p-1.5 pr-2">
        {busy || !reference ? (
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/5 text-studio-orange">
            <Spinner size={18} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reference.previewUrl} alt="" className="h-12 w-12 flex-none rounded-xl object-cover" />
        )}
        <span className="min-w-0 text-xs">
          <span className="block font-medium text-studio-text">{t('chat.reference.label')}</span>
          <span className="block max-w-[11rem] truncate text-studio-subtle sm:max-w-[16rem]">{sub}</span>
        </span>
        {!busy && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('chat.reference.remove')}
            title={t('chat.reference.remove')}
            className="ml-1 flex-none rounded-full p-1.5 text-studio-subtle hover:bg-white/10 hover:text-studio-text"
          >
            <IconClose size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Credits nudge ────────────────────────────────────────────────────────────────────────────

function CreditsNudge({
  credits,
  mode,
  onGetCredits,
}: {
  credits: number;
  mode: GenerationType;
  onGetCredits: () => void;
}) {
  const { t } = useI18n();
  const cost = GENERATION_COST[mode];
  const level: 'none' | 'low' | 'short' = credits < cost ? 'short' : credits < LOW_CREDITS_THRESHOLD ? 'low' : 'none';
  const [dismissed, setDismissed] = useState<string | null>(null);
  const token = `${level}:${mode}`;
  if (level === 'none' || dismissed === token) return null;

  const message =
    level === 'short'
      ? mode === 'video'
        ? t('chat.credits.notEnoughVideo', { cost, credits })
        : t('chat.credits.notEnoughImage', { cost, credits })
      : t('chat.credits.low', { credits });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        'mb-2 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm',
        level === 'short'
          ? 'border-studio-red/30 bg-studio-red/[0.08] text-[#ffc2cd]'
          : 'border-studio-orange/20 bg-studio-orange/[0.06] text-studio-muted',
      )}
    >
      <IconFlame size={15} className="flex-none text-studio-orange" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={onGetCredits}
        className="flex-none rounded-full studio-gradient-bg px-3 py-1 text-xs font-semibold text-white hover:brightness-110"
      >
        {t('chat.credits.getCredits')}
      </button>
      {level === 'low' && (
        <button
          type="button"
          onClick={() => setDismissed(token)}
          aria-label={t('chat.credits.dismiss')}
          title={t('chat.credits.dismiss')}
          className="flex-none rounded-full p-1 text-studio-subtle hover:bg-white/10 hover:text-studio-text"
        >
          <IconClose size={13} />
        </button>
      )}
    </motion.div>
  );
}
