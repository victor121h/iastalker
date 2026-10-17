'use client';

// Sticky top navigation used by the landing, pricing, legal, account and checkout pages.
//  - Desktop (md+): logo · Pricing / FAQ · language · auth actions (or credits + Open studio + avatar menu).
//  - Mobile: logo · primary action (or credit pill) · menu button that opens a slide-in drawer.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import type { PublicUser } from '@/lib/studio/types';
import { formatCount } from './marketing/format';
import { useStudioSession } from './StudioProviders';
import { ButtonLink, CreditPill, LanguageToggle, Logo, Spinner, VipBadge, cx } from './ui';
import {
  IconArrowRight,
  IconChat,
  IconChevronDown,
  IconClose,
  IconFlame,
  IconLogout,
  IconMenu,
  IconUser,
} from './icons';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function initialOf(user: PublicUser): string {
  const source = (user.name || user.email || '?').trim();
  return (Array.from(source)[0] || '?').toUpperCase();
}

/** Logs out, clears the session in the providers and goes back to the landing page. */
function useLogout() {
  const { setUser } = useStudioSession();
  const { te } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await studioApi.logout();
    } catch (err) {
      setPending(false);
      setError(te(err instanceof ApiError ? err.code : 'internal'));
      return;
    }
    setUser(null);
    setPending(false);
    router.replace('/studio');
    router.refresh();
  }, [pending, router, setUser, te]);

  return { logout, pending, error };
}

export function SiteHeader({ className }: { className?: string }) {
  const { user } = useStudioSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation and when the viewport grows past the mobile breakpoint.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const closeDrawer = useCallback((restoreFocus = true) => {
    setDrawerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  const navLinks = [
    { href: '/studio/pricing', label: t('common.pricing'), active: pathname === '/studio/pricing' },
    { href: '/studio#faq', label: t('landing.nav.faq'), active: false },
  ];

  return (
    <header className={cx('sticky top-0 z-50', className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:rounded-xl focus:bg-studio-elevated focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-studio-text focus:shadow-2xl"
      >
        {t('landing.nav.skip')}
      </a>

      {/* Glass background lives on its own layer: a backdrop-filter on <header> itself would become
          the containing block of the fixed mobile drawer. */}
      <div
        aria-hidden="true"
        className={cx(
          'absolute inset-0 border-b transition-[background-color,border-color,box-shadow] duration-300',
          scrolled || drawerOpen
            ? 'border-white/[0.06] bg-studio-bg/75 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-studio-bg/30 backdrop-blur-md',
        )}
      />

      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo size={32} className="flex-none" />

        <nav aria-label={t('landing.nav.main')} className="ml-6 hidden md:block lg:ml-10">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
                    link.active
                      ? 'bg-white/[0.06] text-studio-text'
                      : 'text-studio-muted hover:bg-white/5 hover:text-studio-text',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle className="hidden md:inline-flex" />

          {user ? (
            <>
              <CreditsLink credits={user.credits} />
              <ButtonLink href="/studio/chat" size="sm" className="hidden md:inline-flex">
                {t('landing.nav.openStudio')}
                <IconArrowRight size={16} />
              </ButtonLink>
              <AccountMenu user={user} className="hidden md:block" />
            </>
          ) : (
            <>
              <ButtonLink href="/studio/login" variant="ghost" size="sm" className="hidden md:inline-flex">
                {t('common.login')}
              </ButtonLink>
              <ButtonLink href="/studio/signup" size="sm">
                {t('common.getStarted')}
              </ButtonLink>
            </>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            aria-label={t('landing.nav.openMenu')}
            className="-mr-1.5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-studio-muted transition-colors hover:bg-white/5 hover:text-studio-text md:hidden"
          >
            <IconMenu size={22} />
          </button>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} navLinks={navLinks} user={user} pathname={pathname} />
    </header>
  );
}

function CreditsLink({ credits }: { credits: number }) {
  const { t, lang } = useI18n();
  const label = t('landing.nav.creditsLink', { count: formatCount(credits, lang) });
  return (
    <Link href="/studio/pricing" aria-label={label} title={label} className="rounded-full">
      <CreditPill
        credits={credits}
        className="transition-colors hover:border-studio-red/50 hover:bg-studio-elevated max-sm:[&>span:last-child]:hidden"
      />
    </Link>
  );
}

// ── Desktop avatar menu ──────────────────────────────────────────────────────────────────────
function AccountMenu({ user, className }: { user: PublicUser; className?: string }) {
  const { t } = useI18n();
  const { logout, pending, error } = useLogout();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const isVip = user.tier === 'vip';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls =
    'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-studio-muted transition-colors hover:bg-white/5 hover:text-studio-text';

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t('landing.nav.accountMenu', { name: user.name || user.email })}
        className={cx(
          'flex h-10 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 transition-colors',
          open ? 'border-studio-red/40 bg-white/[0.05]' : 'border-studio-line hover:border-studio-red/40',
        )}
      >
        <Avatar user={user} />
        <IconChevronDown
          size={16}
          className={cx('text-studio-subtle transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-studio-line bg-studio-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center gap-3 border-b border-studio-line px-4 py-3.5">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-studio-subtle">{t('landing.nav.signedInAs')}</p>
            <p className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-studio-text">{user.name || user.email}</span>
              {isVip && <VipBadge className="flex-none !px-1.5 !py-0.5 !text-[9px]" />}
            </p>
            {user.name ? <p className="truncate text-xs text-studio-subtle">{user.email}</p> : null}
          </div>
        </div>
        <div className="p-1.5">
          <Link href="/studio/chat" onClick={() => setOpen(false)} className={itemCls}>
            <IconChat size={17} />
            {t('landing.nav.openStudio')}
          </Link>
          <Link href="/studio/pricing" onClick={() => setOpen(false)} className={itemCls}>
            <IconFlame size={17} />
            {t('common.buyCredits')}
          </Link>
          <Link href="/studio/account" onClick={() => setOpen(false)} className={itemCls}>
            <IconUser size={17} />
            {t('common.account')}
          </Link>
          <div className="my-1 h-px bg-studio-line" />
          <button
            type="button"
            onClick={logout}
            disabled={pending}
            className={cx(itemCls, 'hover:bg-studio-red/10 hover:text-[#ffc2cd] disabled:opacity-60')}
          >
            {pending ? <Spinner size={17} /> : <IconLogout size={17} />}
            {pending ? t('landing.nav.loggingOut') : t('common.logout')}
          </button>
          {error ? (
            <p role="alert" className="px-3 pb-2 pt-1 text-xs text-[#ffc2cd]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Avatar({ user, size = 'md' }: { user: PublicUser; size?: 'md' | 'lg' }) {
  const isVip = user.tier === 'vip';
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex flex-none items-center justify-center rounded-full font-display font-bold text-white',
        size === 'lg' ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm',
        isVip
          ? 'bg-gradient-to-br from-studio-gold via-studio-amber to-studio-orange text-[#2a1600] ring-2 ring-studio-gold/40'
          : 'studio-gradient-bg',
      )}
    >
      {initialOf(user)}
    </span>
  );
}

// ── Mobile drawer ────────────────────────────────────────────────────────────────────────────
function MobileDrawer({
  open,
  onClose,
  navLinks,
  user,
  pathname,
}: {
  open: boolean;
  onClose: (restoreFocus?: boolean) => void;
  navLinks: Array<{ href: string; label: string; active: boolean }>;
  user: PublicUser | null;
  pathname: string | null;
}) {
  const { t, lang } = useI18n();
  const { logout, pending, error } = useLogout();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const linkCls = (active: boolean) =>
    cx(
      'flex h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-medium transition-colors',
      active ? 'bg-white/[0.06] text-studio-text' : 'text-studio-muted hover:bg-white/5 hover:text-studio-text',
    );
  const navigate = () => onClose(false);

  return (
    <div
      className={cx(
        'fixed inset-0 z-[60] transition-[visibility] duration-300 md:hidden',
        open ? 'visible' : 'invisible',
      )}
      aria-hidden={!open}
    >
      <div
        className={cx(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l border-studio-line bg-studio-surface shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-4rem] h-56 w-56 rounded-full bg-studio-red/20 blur-3xl"
        />
        <div className="relative flex h-16 items-center justify-between px-4">
          <h2 id={titleId} className="sr-only">
            {t('landing.nav.menuTitle')}
          </h2>
          <Logo size={30} />
          <button
            ref={closeRef}
            type="button"
            onClick={() => onClose()}
            aria-label={t('landing.nav.closeMenu')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-studio-muted hover:bg-white/5 hover:text-studio-text"
          >
            <IconClose size={22} />
          </button>
        </div>

        <div className="studio-scroll relative flex-1 overflow-y-auto px-3 pb-6">
          {user ? (
            <div className="mx-1 mb-4 flex items-center gap-3 rounded-2xl border border-studio-line bg-studio-bg/50 p-3">
              <Avatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-studio-text">{user.name || user.email}</span>
                  {user.tier === 'vip' && <VipBadge className="flex-none !px-1.5 !py-0.5 !text-[9px]" />}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-studio-muted">
                  <IconFlame size={13} className="text-studio-orange" />
                  {t('common.creditsCount', { count: formatCount(user.credits, lang) })}
                </p>
              </div>
            </div>
          ) : null}

          <nav aria-label={t('landing.nav.main')}>
            <ul className="space-y-1">
              {user ? (
                <li>
                  <DrawerLink href="/studio/chat" onClick={navigate} className={linkCls(false)}>
                    <span className="inline-flex items-center gap-3">
                      <IconChat size={18} />
                      {t('landing.nav.openStudio')}
                    </span>
                  </DrawerLink>
                </li>
              ) : null}
              {navLinks.map((link) => (
                <li key={link.href}>
                  <DrawerLink
                    href={link.href}
                    onClick={navigate}
                    className={linkCls(link.active)}
                    current={link.active}
                  >
                    {link.label}
                  </DrawerLink>
                </li>
              ))}
              {user ? (
                <li>
                  <DrawerLink
                    href="/studio/account"
                    onClick={navigate}
                    className={linkCls(pathname === '/studio/account')}
                    current={pathname === '/studio/account'}
                  >
                    <span className="inline-flex items-center gap-3">
                      <IconUser size={18} />
                      {t('common.account')}
                    </span>
                  </DrawerLink>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="mx-1 mt-4 flex items-center justify-between rounded-2xl border border-studio-line px-4 py-2">
            <span className="text-sm text-studio-muted">{t('common.language')}</span>
            <LanguageToggle className="-mr-2" />
          </div>
        </div>

        <div className="relative space-y-2.5 border-t border-studio-line p-4">
          {user ? (
            <>
              <ButtonLink href="/studio/pricing" onClick={navigate} fullWidth size="lg">
                <IconFlame size={18} />
                {t('common.buyCredits')}
              </ButtonLink>
              <button
                type="button"
                onClick={logout}
                disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-studio-muted transition-colors hover:bg-studio-red/10 hover:text-[#ffc2cd] disabled:opacity-60"
              >
                {pending ? <Spinner size={17} /> : <IconLogout size={17} />}
                {pending ? t('landing.nav.loggingOut') : t('common.logout')}
              </button>
              {error ? (
                <p role="alert" className="text-center text-xs text-[#ffc2cd]">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <ButtonLink href="/studio/signup" onClick={navigate} fullWidth size="lg">
                {t('common.getStarted')}
                <IconArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href="/studio/login" onClick={navigate} variant="secondary" fullWidth size="lg">
                {t('common.login')}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerLink({
  href,
  onClick,
  className,
  current,
  children,
}: {
  href: string;
  onClick: () => void;
  className: string;
  current?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={onClick} className={className} aria-current={current ? 'page' : undefined}>
      {children}
      <IconArrowRight size={16} className="text-studio-subtle" />
    </Link>
  );
}
