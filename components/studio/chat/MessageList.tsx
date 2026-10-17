'use client';

// Scrollable conversation: sticks to the bottom while new content arrives (media loading,
// statuses changing) unless the user scrolled up, jumps to the end when switching conversation
// and offers a "jump to latest" button.
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { Alert, Button } from '@/components/studio/ui';
import { IconChevronDown, IconRefresh } from '@/components/studio/icons';
import { GenerationItem, type GenerationActions } from './GenerationItem';
import type { ChatItem } from './types';

// useLayoutEffect warns during SSR; the effect only matters in the browser.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const STICK_DISTANCE = 96;
const JUMP_DISTANCE = 360;

export function MessageList({
  viewKey,
  items,
  loading,
  error,
  onRetryLoad,
  empty,
  bottomPadding,
  scrollSignal,
  busy,
  actions,
}: {
  /** Changes when the user opens another conversation (or a new one). */
  viewKey: number;
  items: ChatItem[];
  /** The conversation is being fetched and nothing is cached yet. */
  loading: boolean;
  error: boolean;
  onRetryLoad: () => void;
  /** Rendered when there is nothing to show. */
  empty: ReactNode;
  /** Height reserved for the floating composer. */
  bottomPadding: number;
  /** Incremented when the user sends something: scroll to the end. */
  scrollSignal: number;
  busy: boolean;
  actions: GenerationActions;
}) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const programmaticUntil = useRef(0);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    programmaticUntil.current = Date.now() + (behavior === 'smooth' ? 700 : 80);
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
    setShowJump(false);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (Date.now() > programmaticUntil.current) stickRef.current = distance < STICK_DISTANCE;
    setShowJump(distance > JUMP_DISTANCE);
  }, []);

  // New conversation opened → start at the bottom.
  useIsoLayoutEffect(() => {
    scrollToBottom('auto');
  }, [viewKey, scrollToBottom]);

  // The user just sent something → follow it.
  useEffect(() => {
    if (scrollSignal > 0) scrollToBottom('smooth');
  }, [scrollSignal, scrollToBottom]);

  // Content grew (new bubble, media loaded, status changed) → stay pinned when we were.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
      else onScroll();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [onScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [bottomPadding]);

  const showEmpty = items.length === 0 && !loading && !error;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="studio-scroll absolute inset-0 overflow-y-auto overscroll-contain"
      >
        <div style={{ paddingBottom: bottomPadding + 20 }}>
          <div ref={contentRef} className="mx-auto w-full max-w-3xl px-3 pt-5 sm:px-6 sm:pt-8">
            {showEmpty ? (
              empty
            ) : error && items.length === 0 ? (
              <div className="mx-auto max-w-md py-16">
                <Alert>
                  <p>{t('chat.load.error')}</p>
                  <Button size="sm" variant="secondary" onClick={onRetryLoad} className="mt-3">
                    <IconRefresh size={15} />
                    {t('common.retry')}
                  </Button>
                </Alert>
              </div>
            ) : loading && items.length === 0 ? (
              <LoadingSkeleton label={t('common.loading')} />
            ) : (
              <motion.div
                key={viewKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="space-y-8 sm:space-y-10"
              >
                {items.map((item) => (
                  <GenerationItem
                    key={item.key}
                    item={item}
                    busy={busy}
                    onOpenImage={actions.onOpenImage}
                    onUseReference={actions.onUseReference}
                    onAnimate={actions.onAnimate}
                    onRegenerate={actions.onRegenerate}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJump && !showEmpty && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => scrollToBottom('smooth')}
            aria-label={t('chat.jumpToLatest')}
            title={t('chat.jumpToLatest')}
            style={{ bottom: bottomPadding + 14 }}
            className="absolute left-1/2 z-10 -ml-5 flex h-10 w-10 items-center justify-center rounded-full border border-studio-line bg-studio-elevated text-studio-text shadow-xl hover:border-studio-red/50"
          >
            <IconChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="space-y-8"
      role="status"
      aria-label={label}
    >
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4" aria-hidden="true">
          <div className="flex justify-end">
            <div className="h-20 w-2/3 max-w-sm rounded-3xl rounded-br-lg studio-shimmer" />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-[30px] w-[30px] flex-none rounded-xl studio-shimmer" />
            <div className="aspect-square w-full max-w-[320px] rounded-2xl studio-shimmer" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
