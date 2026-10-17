'use client';

// One generation rendered as a chat exchange: the user's prompt bubble (right) followed by the
// assistant's bubble (left) — a live placeholder while it renders, the media with actions once
// completed, or the failure with the refund status and a retry.
import { motion } from 'framer-motion';
import { memo, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BRAND_NAME, GENERATION_COST, VIDEO_DURATION_SECONDS, type AspectRatio } from '@/lib/studio/plans';
import type { GenerationDTO } from '@/lib/studio/types';
import { useI18n } from '@/lib/studio/i18n/client';
import { Button, LogoMark, cx } from '@/components/studio/ui';
import {
  IconAlert,
  IconCheck,
  IconDownload,
  IconFlame,
  IconImage,
  IconPaperclip,
  IconRefresh,
  IconVideo,
} from '@/components/studio/icons';
import { isPendingStatus, type ChatItem } from './types';
import { RATIO_CSS, RATIO_MAX_WIDTH, downloadFileName, formatElapsed, isSameOrigin } from './utils';
import { RatioShape } from './RatioShape';

export interface GenerationActions {
  onOpenImage: (g: GenerationDTO) => void;
  onUseReference: (g: GenerationDTO) => void;
  onAnimate: (g: GenerationDTO) => void;
  onRegenerate: (g: GenerationDTO) => void;
}

interface GenerationItemProps extends GenerationActions {
  item: ChatItem;
  /** A generate request is in flight: regenerate / retry are temporarily disabled. */
  busy: boolean;
}

function GenerationItemBase({ item, busy, onOpenImage, onUseReference, onAnimate, onRegenerate }: GenerationItemProps) {
  const g = item.generation;
  return (
    <motion.article
      initial={item.fresh ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
      aria-busy={isPendingStatus(g.status) || item.optimistic || undefined}
    >
      <UserBubble generation={g} />
      <AssistantBubble
        item={item}
        busy={busy}
        onOpenImage={onOpenImage}
        onUseReference={onUseReference}
        onAnimate={onAnimate}
        onRegenerate={onRegenerate}
      />
    </motion.article>
  );
}

export const GenerationItem = memo(GenerationItemBase);

// ── User bubble ──────────────────────────────────────────────────────────────────────────────

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 text-[11px] font-medium text-studio-muted">
      {children}
    </span>
  );
}

function UserBubble({ generation: g }: { generation: GenerationDTO }) {
  const { t } = useI18n();
  const [refBroken, setRefBroken] = useState(false);
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-3xl rounded-br-lg border border-studio-line bg-studio-elevated px-4 py-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] sm:max-w-[75%]">
        <span className="sr-only">{t('chat.item.you')}: </span>
        {g.referenceUrl && !refBroken && (
          <div className="mb-2.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.referenceUrl}
              alt={t('chat.item.reference')}
              onError={() => setRefBroken(true)}
              className="h-16 w-16 rounded-xl border border-white/10 object-cover sm:h-20 sm:w-20"
            />
            <span className="inline-flex items-center gap-1 text-xs text-studio-subtle">
              <IconPaperclip size={13} />
              {t('chat.item.reference')}
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-studio-text">{g.prompt}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Chip>
            {g.type === 'video' ? <IconVideo size={12} /> : <IconImage size={12} />}
            {g.type === 'video' ? t('common.video') : t('common.image')}
          </Chip>
          <Chip>
            <RatioShape ratio={g.aspectRatio} size={11} />
            {g.aspectRatio}
          </Chip>
          <Chip>
            <IconFlame size={11} className="text-studio-orange" />
            {t('chat.item.cost', { cost: g.cost })}
          </Chip>
        </div>
      </div>
    </div>
  );
}

// ── Assistant bubble ─────────────────────────────────────────────────────────────────────────

function AssistantBubble({ item, busy, onOpenImage, onUseReference, onAnimate, onRegenerate }: GenerationItemProps) {
  const g = item.generation;
  const pending = item.optimistic || isPendingStatus(g.status);
  return (
    <div className="flex items-start gap-3">
      <LogoMark size={30} className="mt-0.5 flex-none" />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{BRAND_NAME}: </span>
        {pending ? (
          <PendingMedia generation={g} sending={Boolean(item.optimistic)} />
        ) : g.status === 'completed' && g.resultUrl ? (
          <CompletedMedia
            generation={g}
            busy={busy}
            onOpenImage={onOpenImage}
            onUseReference={onUseReference}
            onAnimate={onAnimate}
            onRegenerate={onRegenerate}
          />
        ) : (
          <FailedCard generation={g} busy={busy} onRetry={onRegenerate} />
        )}
      </div>
    </div>
  );
}

function mediaBoxStyle(ratio: AspectRatio) {
  return { aspectRatio: RATIO_CSS[ratio], maxWidth: RATIO_MAX_WIDTH[ratio], width: '100%' } as const;
}

function useElapsed(createdAt: string, running: boolean): number {
  const start = new Date(createdAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return Number.isFinite(start) ? Math.max(0, now - start) : 0;
}

function PendingMedia({ generation: g, sending }: { generation: GenerationDTO; sending: boolean }) {
  const { t } = useI18n();
  const elapsed = useElapsed(g.createdAt, true);
  const label = sending ? t('chat.pending.sending') : g.type === 'video' ? t('chat.pending.video') : t('chat.pending.image');
  return (
    <div
      className="studio-shimmer relative overflow-hidden rounded-2xl border border-studio-line bg-studio-surface"
      style={mediaBoxStyle(g.aspectRatio)}
    >
      <div className="absolute inset-0 bg-studio-fire-soft opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="relative flex h-16 w-16 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-1 rounded-full bg-studio-orange/50 blur-xl animate-studio-pulse-glow" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl studio-gradient-bg studio-glow-sm animate-studio-float">
            <IconFlame size={24} className="text-white" />
          </span>
        </span>
        <p role="status" className="max-w-[17rem] text-sm font-medium leading-snug text-studio-text">
          {label}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-studio-muted">
          <span className="tabular-nums" title={t('chat.pending.elapsed')}>
            <span className="sr-only">{t('chat.pending.elapsed')}: </span>
            {formatElapsed(elapsed)}
          </span>
          {g.queuePosition !== null && g.queuePosition > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('chat.pending.queue', { position: g.queuePosition })}</span>
            </>
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/5" aria-hidden="true">
        <motion.div
          className="h-full w-1/3 studio-gradient-bg"
          initial={{ x: '-100%' }}
          animate={{ x: '300%' }}
          transition={{ repeat: Infinity, duration: g.type === 'video' ? 2.4 : 1.5, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  compact,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={compact ? label : undefined}
      className={actionClasses}
    >
      {icon}
      <span className={cx(compact && 'hidden sm:inline')}>{label}</span>
    </button>
  );
}

const actionClasses =
  'inline-flex h-9 items-center gap-1.5 rounded-full border border-studio-line bg-white/[0.03] px-3 text-sm text-studio-muted transition-colors hover:border-studio-red/40 hover:text-studio-text disabled:cursor-not-allowed disabled:opacity-50';

export function DownloadLink({ generation: g, compact, className }: { generation: GenerationDTO; compact?: boolean; className?: string }) {
  const { t } = useI18n();
  if (!g.resultUrl) return null;
  const sameOrigin = isSameOrigin(g.resultUrl);
  const label = t('chat.result.download');
  return (
    <a
      href={g.resultUrl}
      download={sameOrigin ? downloadFileName(g.id, g.resultUrl, g.type) : undefined}
      target={sameOrigin ? undefined : '_blank'}
      rel={sameOrigin ? undefined : 'noopener noreferrer'}
      title={label}
      aria-label={compact ? label : undefined}
      className={className ?? actionClasses}
    >
      <IconDownload size={16} />
      <span className={cx(compact && 'hidden sm:inline')}>{label}</span>
    </a>
  );
}

export function AnimateButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('chat.result.animateHint', { seconds: VIDEO_DURATION_SECONDS })}
      className={cx(
        'studio-gradient-border inline-flex h-9 items-center gap-2 rounded-full bg-studio-red/10 pl-3 pr-1.5 text-sm font-semibold text-studio-text shadow-[0_8px_26px_-12px_rgba(255,74,43,0.9)] transition-all hover:bg-studio-red/20 hover:shadow-[0_10px_30px_-10px_rgba(255,74,43,1)]',
        className,
      )}
    >
      <IconVideo size={16} className="text-studio-amber" />
      <span>{t('chat.result.animate')}</span>
      <span className="inline-flex h-6 items-center gap-0.5 rounded-full studio-gradient-bg px-2 text-[11px] font-bold text-white">
        <IconFlame size={11} />
        {GENERATION_COST.video}
      </span>
    </button>
  );
}

/** Pauses an autoplaying video while it is scrolled out of view and resumes it when back. */
function usePauseWhenHidden(ref: RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let pausedByUs = false;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (!entry.isIntersecting) {
          if (!el.paused) {
            pausedByUs = true;
            el.pause();
          }
        } else if (pausedByUs) {
          pausedByUs = false;
          el.play().catch(() => {});
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

function CompletedMedia({
  generation: g,
  busy,
  onOpenImage,
  onUseReference,
  onAnimate,
  onRegenerate,
}: GenerationActions & { generation: GenerationDTO; busy: boolean }) {
  const { t } = useI18n();
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  usePauseWhenHidden(videoRef);
  const url = g.resultUrl as string;
  const shortPrompt = g.prompt.length > 120 ? `${g.prompt.slice(0, 117)}…` : g.prompt;
  const isImage = g.type === 'image';

  return (
    <div>
      <div
        className={cx(
          'group relative overflow-hidden rounded-2xl border border-studio-line bg-studio-surface',
          !loaded && !broken && 'studio-shimmer',
        )}
        style={mediaBoxStyle(g.aspectRatio)}
      >
        {broken ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-studio-muted">
            <IconAlert size={22} className="text-studio-subtle" />
            {t('chat.result.mediaUnavailable')}
          </div>
        ) : isImage ? (
          <button
            type="button"
            onClick={() => onOpenImage(g)}
            aria-label={t('chat.result.openFullscreen')}
            className="block h-full w-full cursor-zoom-in focus-visible:outline-offset-[-2px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={t('chat.result.imageAlt', { prompt: shortPrompt })}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
              className={cx(
                'h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          </button>
        ) : (
          <video
            ref={videoRef}
            src={url}
            controls
            loop
            playsInline
            muted
            autoPlay
            preload="metadata"
            aria-label={t('chat.result.videoLabel', { prompt: shortPrompt })}
            onLoadedMetadata={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className="h-full w-full bg-black object-cover"
          />
        )}
      </div>

      {!broken && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isImage && <AnimateButton onClick={() => onAnimate(g)} />}
          <DownloadLink generation={g} compact={isImage} />
          {isImage && (
            <ActionButton
              compact
              icon={<IconPaperclip size={16} />}
              label={t('chat.result.useReference')}
              onClick={() => onUseReference(g)}
            />
          )}
          <ActionButton
            compact={isImage}
            icon={<IconRefresh size={16} />}
            label={t('chat.result.regenerate')}
            onClick={() => onRegenerate(g)}
            disabled={busy}
          />
        </div>
      )}
      {broken && (
        <div className="mt-3">
          <ActionButton
            icon={<IconRefresh size={16} />}
            label={t('chat.result.regenerate')}
            onClick={() => onRegenerate(g)}
            disabled={busy}
          />
        </div>
      )}
    </div>
  );
}

function FailedCard({
  generation: g,
  busy,
  onRetry,
}: {
  generation: GenerationDTO;
  busy: boolean;
  onRetry: (g: GenerationDTO) => void;
}) {
  const { t, te } = useI18n();
  const message =
    g.errorCode === 'provider_error'
      ? t('chat.failed.provider_error')
      : g.errorCode === 'timeout'
        ? t('chat.failed.timeout')
        : te(g.errorCode);
  return (
    <div className="max-w-md rounded-2xl border border-studio-red/30 bg-studio-red/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-studio-red/15 text-studio-red">
          <IconAlert size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-studio-text">{t('chat.failed.title')}</p>
          <p className="mt-1 text-sm leading-relaxed text-studio-muted">{message}</p>
          {g.refunded && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-studio-success/10 px-2.5 py-1 text-xs font-medium text-studio-success">
              <IconCheck size={13} strokeWidth={2.4} />
              {t('chat.failed.refunded', { cost: g.cost })}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 pl-12">
        <Button size="sm" variant="secondary" onClick={() => onRetry(g)} disabled={busy}>
          <IconRefresh size={15} />
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
}
