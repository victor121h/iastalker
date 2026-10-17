'use client';

// Account disclosure at the bottom of the sidebar: name/email (+ VIP badge), Account link,
// language switch and log out.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { LanguageToggle, Spinner, VipBadge, cx } from '@/components/studio/ui';
import { IconChevronDown, IconLogout, IconUser } from '@/components/studio/icons';
import { useToast } from './Toast';
import { initialOf } from './utils';

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, setUser } = useStudioSession();
  const { t, te } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const isVip = user.tier === 'vip';

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await studioApi.logout();
    } catch (err) {
      setLoggingOut(false);
      toast.show(te(err instanceof ApiError ? err.code : 'internal'), { variant: 'error' });
      return;
    }
    setUser(null);
    router.replace('/studio');
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t('chat.user.menu', { name: user.name || user.email })}
        className={cx(
          'flex w-full items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-colors',
          open ? 'border-studio-red/40 bg-white/[0.05]' : 'border-transparent hover:bg-white/[0.04]',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'flex h-9 w-9 flex-none items-center justify-center rounded-full font-display text-sm font-bold',
            isVip ? 'bg-gradient-to-br from-studio-gold to-studio-amber text-[#2a1600]' : 'studio-gradient-bg text-white',
          )}
        >
          {initialOf(user.name, user.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-studio-text">{user.name || user.email}</span>
            {isVip && <VipBadge className="flex-none !px-1.5 !py-0.5 !text-[9px]" />}
          </span>
          <span className="block truncate text-xs text-studio-subtle">{user.email}</span>
        </span>
        <IconChevronDown
          size={16}
          className={cx('flex-none text-studio-subtle transition-transform', open ? 'rotate-0' : 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-full z-30 mb-2 origin-bottom overflow-hidden rounded-2xl border border-studio-line bg-studio-elevated shadow-2xl"
          >
            <div className="border-b border-studio-line px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-studio-subtle">{t('chat.user.signedInAs')}</p>
              <p className="mt-0.5 truncate text-sm text-studio-text">{user.email}</p>
            </div>
            <div className="p-1.5">
              <Link
                href="/studio/account"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-studio-muted hover:bg-white/5 hover:text-studio-text"
              >
                <IconUser size={17} />
                {t('common.account')}
              </Link>
              <div className="flex h-10 items-center justify-between gap-2 rounded-xl pl-3 pr-1 text-sm text-studio-muted">
                <span>{t('common.language')}</span>
                <LanguageToggle className="!h-8" />
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-studio-muted hover:bg-studio-red/10 hover:text-[#ffc2cd] disabled:opacity-60"
              >
                {loggingOut ? <Spinner size={17} /> : <IconLogout size={17} />}
                {loggingOut ? t('chat.user.loggingOut') : t('common.logout')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
