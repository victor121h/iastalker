'use client';

// Minimal toast system local to the chat: errors and info messages, optional action button,
// auto-dismiss (paused while hovered or focused), announced to screen readers.
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import { cx } from '@/components/studio/ui';
import { IconAlert, IconCheck, IconClose, IconSparkles } from '@/components/studio/icons';

export type ToastVariant = 'error' | 'info' | 'success';

export interface ToastOptions {
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
  /** Milliseconds before auto-dismiss (0 = sticky). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

interface ToastApi {
  show: (message: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts((list) => {
      // The same message twice in a row replaces the previous one (restarts its timer).
      const rest = list.filter((t) => t.message !== message);
      return [...rest, { id, message, ...opts }].slice(-MAX_VISIBLE);
    });
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  return (
    <div
      role="region"
      aria-label={t('chat.toast.region')}
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3 sm:top-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const variant = toast.variant ?? 'info';
  const duration = toast.duration ?? (variant === 'error' ? 7000 : 5000);

  useEffect(() => {
    if (paused || duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [paused, duration, onDismiss, toast.id]);

  const icon =
    variant === 'error' ? (
      <IconAlert size={18} className="text-studio-red" />
    ) : variant === 'success' ? (
      <IconCheck size={18} className="text-studio-success" />
    ) : (
      <IconSparkles size={18} className="text-studio-orange" />
    );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={variant === 'error' ? 'alert' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm text-studio-text shadow-2xl studio-glass',
        variant === 'error' && 'border-studio-red/40',
        variant === 'success' && 'border-studio-success/30',
      )}
    >
      <span className="mt-px flex-none">{icon}</span>
      <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="flex-none rounded-lg px-2 py-0.5 text-sm font-semibold text-studio-orange hover:bg-white/5 hover:text-studio-amber"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={t('chat.toast.dismiss')}
        className="-mr-1 flex-none rounded-lg p-1 text-studio-subtle hover:bg-white/5 hover:text-studio-text"
      >
        <IconClose size={16} />
      </button>
    </motion.div>
  );
}
