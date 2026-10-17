'use client';

import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { BRAND_NAME } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { Card, LanguageToggle, Logo, cx } from '@/components/studio/ui';
import { IconShield } from '@/components/studio/icons';
import { AuthVisual } from './AuthVisual';

/**
 * Layout for every auth page.
 *  - Desktop (lg+): split screen — left: logo + form card; right: immersive visual panel.
 *  - Mobile: just the form, logo on top and the language toggle in the corner.
 */
export function AuthShell({
  title,
  subtitle,
  icon,
  children,
  below,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional emblem rendered above the title (used by the status screens). */
  icon?: ReactNode;
  /** Card content (the form). */
  children: ReactNode;
  /** Secondary links shown under the card ("Don't have an account? Sign up"). */
  below?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const year = new Date().getFullYear();

  return (
    <div className={cx('relative min-h-[100dvh] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]', className)}>
      <div className="relative flex min-h-[100dvh] flex-col px-4 pb-6 pt-4 sm:px-8 sm:pt-6 lg:px-12 xl:px-20">
        {/* Ambient fire glow behind the form on small screens (the visual panel is hidden there). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden lg:hidden">
          <div className="absolute -top-32 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-studio-red/20 blur-3xl" />
          <div className="absolute -top-20 right-[-6rem] h-56 w-56 rounded-full bg-studio-orange/15 blur-3xl" />
        </div>

        <header className="relative z-10 flex items-center justify-between gap-3">
          <Logo size={34} />
          <LanguageToggle className="-mr-2" />
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center py-8 sm:py-12">
          <section aria-labelledby={headingId} className="w-full max-w-[440px]">
            {icon ? <div className="mb-5">{icon}</div> : null}
            <h1
              id={headingId}
              className="font-display text-[28px] font-bold leading-tight tracking-tight text-studio-text sm:text-[32px]"
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-studio-muted">{subtitle}</p> : null}

            <Card className="relative mt-6 p-5 shadow-[0_40px_120px_-50px_rgba(255,31,75,0.55)] sm:p-7">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-studio-orange/60 to-transparent"
              />
              {children}
            </Card>

            {below ? <div className="mt-6 text-center text-sm text-studio-muted">{below}</div> : null}
          </section>
        </main>

        <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-studio-subtle lg:justify-start">
          <span className="inline-flex items-center gap-1.5">
            <IconShield size={14} />
            {t('common.adultsOnly')}
          </span>
          <Link href="/studio/terms" className="rounded hover:text-studio-text">
            {t('common.terms')}
          </Link>
          <span>
            © {year} {BRAND_NAME}
          </span>
        </footer>
      </div>

      <AuthVisual />
    </div>
  );
}

/** Text link styled for the auth pages. */
export function AuthLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        'rounded font-semibold text-studio-orange underline-offset-4 transition-colors hover:text-studio-amber hover:underline',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Round fire emblem used above titles on status screens (email sent, link expired…). */
export function AuthEmblem({ children, tone = 'fire' }: { children: ReactNode; tone?: 'fire' | 'muted' }) {
  return (
    <span
      className={cx(
        'flex h-14 w-14 items-center justify-center rounded-2xl text-white',
        tone === 'fire' ? 'studio-gradient-bg studio-glow-sm' : 'border border-studio-line bg-studio-elevated text-studio-orange',
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
