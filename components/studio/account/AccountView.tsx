'use client';

// The /studio/account page: overview (balance + tier), profile, credit activity, purchases,
// security and session. Data comes from GET /api/studio/account; the balance, name and tier shown
// are the live session user so they stay in sync with the header.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ApiError, studioApi } from '@/lib/studio/api-client';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import { SUPPORT_EMAIL } from '@/lib/studio/plans';
import type { LedgerEntryDTO, PaymentDTO, PublicUser } from '@/lib/studio/types';
import { useStudioSession } from '@/components/studio/StudioProviders';
import { SiteFooter } from '@/components/studio/SiteFooter';
import { SiteHeader } from '@/components/studio/SiteHeader';
import { Button, Card, VipBadge, cx } from '@/components/studio/ui';
import {
  IconAlert,
  IconCrown,
  IconFlame,
  IconLogout,
  IconMail,
  IconRefresh,
  IconShield,
  IconSparkles,
  IconUser,
} from '@/components/studio/icons';
import { AccountSkeleton } from './AccountSkeleton';
import { ActivitySection } from './ActivitySection';
import { CreditsCard, TierCard } from './OverviewCards';
import { ProfileSection } from './ProfileSection';
import { PurchasesSection } from './PurchasesSection';
import { SecuritySection } from './SecuritySection';
import { SessionSection } from './SessionSection';

interface AccountData {
  user: PublicUser;
  ledger: LedgerEntryDTO[];
  payments: PaymentDTO[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; code: string }
  | { status: 'ready'; data: AccountData };

const LOGIN_REDIRECT = '/studio/login?next=/studio/account';
/** Silently refresh the history when the tab becomes visible again after this long. */
const STALE_AFTER_MS = 30 * 1000;

const SECTIONS: Array<{ id: string; label: MessageKey; icon: ReactNode }> = [
  { id: 'overview', label: 'account.nav.overview', icon: <IconSparkles size={18} /> },
  { id: 'profile', label: 'account.nav.profile', icon: <IconUser size={18} /> },
  { id: 'activity', label: 'account.nav.activity', icon: <IconFlame size={18} /> },
  { id: 'purchases', label: 'account.nav.purchases', icon: <IconCrown size={18} /> },
  { id: 'security', label: 'account.nav.security', icon: <IconShield size={18} /> },
  { id: 'session', label: 'account.nav.session', icon: <IconLogout size={18} /> },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function initialOf(user: PublicUser): string {
  const source = (user.name || user.email || '?').trim();
  return (Array.from(source)[0] || '?').toUpperCase();
}

function firstName(user: PublicUser): string {
  return (user.name || '').trim().split(/\s+/)[0] || '';
}

export function AccountView() {
  const { t, te } = useI18n();
  const { user, setUser } = useStudioSession();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);
  const loadedAtRef = useRef(0);
  const mountedRef = useRef(true);
  const scrolledToHashRef = useRef(false);

  const onUnauthorized = useCallback(() => {
    setUser(null);
    router.replace(LOGIN_REDIRECT);
  }, [router, setUser]);
  // `load` reads the latest handler through a ref so its identity never changes (it drives the
  // mount effect below and must not re-run when the router object changes).
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const request = ++requestRef.current;
      if (opts.silent) setRefreshing(true);
      else setState({ status: 'loading' });
      try {
        const data = await studioApi.account();
        if (!mountedRef.current || request !== requestRef.current) return;
        loadedAtRef.current = Date.now();
        setUser(data.user);
        setState({ status: 'ready', data });
      } catch (err) {
        if (!mountedRef.current || request !== requestRef.current) return;
        const code = err instanceof ApiError ? err.code : 'internal';
        if (code === 'unauthorized') {
          onUnauthorizedRef.current();
          return;
        }
        // A failed background refresh keeps the data already on screen.
        if (!opts.silent) setState({ status: 'error', code });
      } finally {
        if (mountedRef.current && request === requestRef.current) setRefreshing(false);
      }
    },
    [setUser],
  );

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Coming back from a checkout in another tab: refresh balance / history quietly.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (loadedAtRef.current && Date.now() - loadedAtRef.current > STALE_AFTER_MS) void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const ready = state.status === 'ready';
  const me = user ?? (state.status === 'ready' ? state.data.user : null);

  // Deep links (/studio/account#purchases): the sections only exist once data has loaded.
  useEffect(() => {
    if (!ready || scrolledToHashRef.current) return;
    scrolledToHashRef.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !SECTION_IDS.includes(id)) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [ready]);

  const [active, setActive] = useActiveSection(ready);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="relative flex-1 focus:outline-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(700px_320px_at_20%_0%,rgba(255,31,75,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <PageHeader user={me} />

          <MobileSectionNav active={active} onNavigate={setActive} />

          <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10">
            <aside className="hidden lg:block">
              <DesktopSectionNav active={active} onNavigate={setActive} />
            </aside>

            <div className="min-w-0">
              {state.status === 'loading' || !me ? (
                <div role="status" aria-live="polite">
                  <span className="sr-only">{t('account.loading')}</span>
                  <AccountSkeleton />
                </div>
              ) : state.status === 'error' ? (
                <Card className="flex flex-col items-center px-6 py-14 text-center">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-studio-red/30 bg-studio-red/10 text-studio-red"
                  >
                    <IconAlert size={26} />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-semibold text-studio-text">{t('account.error.title')}</h2>
                  <p role="alert" className="mt-2 max-w-md text-sm text-studio-muted">
                    {te(state.code)}
                  </p>
                  <Button className="mt-6" onClick={() => void load()}>
                    <IconRefresh size={18} />
                    {t('common.retry')}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <section
                    id="overview"
                    tabIndex={-1}
                    aria-label={t('account.nav.overview')}
                    className="grid scroll-mt-32 gap-4 focus:outline-none sm:gap-6 lg:scroll-mt-24 xl:grid-cols-5"
                  >
                    <CreditsCard user={me} className="xl:col-span-3" />
                    <TierCard user={me} className="xl:col-span-2" />
                  </section>
                  <ProfileSection user={me} onUnauthorized={onUnauthorized} />
                  <ActivitySection
                    ledger={state.data.ledger}
                    payments={state.data.payments}
                    refreshing={refreshing}
                    onRefresh={() => void load({ silent: true })}
                  />
                  <PurchasesSection payments={state.data.payments} />
                  <SecuritySection email={me.email} onUnauthorized={onUnauthorized} />
                  <SessionSection email={me.email} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────────────────────
function PageHeader({ user }: { user: PublicUser | null }) {
  const { t } = useI18n();
  const isVip = user?.tier === 'vip';
  const name = user ? firstName(user) : '';

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      {user ? (
        <span
          aria-hidden="true"
          className={cx(
            'flex h-14 w-14 flex-none items-center justify-center rounded-2xl font-display text-2xl font-bold sm:h-16 sm:w-16',
            isVip
              ? 'bg-gradient-to-br from-studio-gold via-studio-amber to-studio-orange text-[#2a1600] ring-2 ring-studio-gold/40'
              : 'studio-gradient-bg text-white studio-glow-sm',
          )}
        >
          {initialOf(user)}
        </span>
      ) : (
        <span aria-hidden="true" className="studio-shimmer h-14 w-14 flex-none rounded-2xl sm:h-16 sm:w-16" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-studio-orange">{t('account.eyebrow')}</p>
        <h1 className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-bold tracking-tight text-studio-text sm:text-3xl">
          <span className="min-w-0 break-words">
            {name ? t('account.greeting', { name }) : t('account.greetingFallback')}
          </span>
          {isVip ? <VipBadge /> : null}
        </h1>
        <p className="mt-1 text-sm text-studio-muted sm:text-[15px]">{t('account.subtitle')}</p>
      </div>
    </div>
  );
}

// ── In-page navigation ───────────────────────────────────────────────────────────────────────
/** Tracks which section is in the upper part of the viewport. */
function useActiveSection(enabled: boolean) {
  const [active, setActiveState] = useState(SECTION_IDS[0]);
  const lockUntil = useRef(0);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!elements.length) return;
    const visible: Record<string, boolean> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible[entry.target.id] = entry.isIntersecting;
        });
        if (Date.now() < lockUntil.current) return;
        const first = SECTION_IDS.find((id) => visible[id]);
        if (first) setActiveState(first);
      },
      { rootMargin: '-128px 0px -50% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);

  /** Called when the user picks a section: highlight it right away and ignore scroll updates briefly. */
  const setActive = useCallback((id: string) => {
    lockUntil.current = Date.now() + 900;
    setActiveState(id);
  }, []);

  return [active, setActive] as const;
}

function useSectionClick(onNavigate: (id: string) => void) {
  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>, id: string) => {
      const target = document.getElementById(id);
      if (!target || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(id);
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
      try {
        window.history.replaceState(window.history.state, '', `#${id}`);
      } catch {
        /* ignore */
      }
    },
    [onNavigate],
  );
}

function DesktopSectionNav({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const onClick = useSectionClick(onNavigate);
  return (
    <div className="sticky top-24 space-y-6">
      <nav aria-label={t('account.nav.label')}>
        <ul className="space-y-1">
          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => onClick(e, section.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={cx(
                    'relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.06] text-studio-text'
                      : 'text-studio-muted hover:bg-white/[0.03] hover:text-studio-text',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity',
                      isActive ? 'studio-gradient-bg opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className={cx('flex-none', isActive ? 'text-studio-orange' : 'text-studio-subtle')}>
                    {section.icon}
                  </span>
                  {t(section.label)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="rounded-2xl border border-studio-line bg-studio-surface/70 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-studio-text">
          <IconMail size={16} className="text-studio-orange" />
          {t('account.nav.help')}
        </p>
        <p className="mt-1 text-xs text-studio-muted">
          {t('account.nav.helpBody')}{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="break-all rounded font-medium text-studio-orange underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}

function MobileSectionNav({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const onClick = useSectionClick(onNavigate);
  const scrollerRef = useRef<HTMLUListElement>(null);

  // Keep the highlighted chip visible inside the horizontal scroller.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!scroller || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 16;
    if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [active]);

  return (
    <nav
      aria-label={t('account.nav.label')}
      className="sticky top-16 z-30 -mx-4 mt-6 border-b border-white/[0.06] bg-studio-bg/80 backdrop-blur-xl sm:-mx-6 lg:hidden"
    >
      <ul ref={scrollerRef} className="studio-scroll flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        {SECTIONS.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id} className="flex-none">
              <a
                href={`#${section.id}`}
                data-section={section.id}
                onClick={(e) => onClick(e, section.id)}
                aria-current={isActive ? 'location' : undefined}
                className={cx(
                  'inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-studio-red/40 bg-studio-fire-soft text-studio-text'
                    : 'border-studio-line text-studio-muted hover:text-studio-text',
                )}
              >
                {t(section.label)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
