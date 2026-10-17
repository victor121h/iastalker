'use client';

// Small building blocks shared by the marketing pages (landing, pricing, legal, 404).
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SUPPORT_EMAIL } from '@/lib/studio/plans';
import { cx } from '@/components/studio/ui';
import { SiteFooter } from '@/components/studio/SiteFooter';
import { SiteHeader } from '@/components/studio/SiteHeader';

/** Header + <main id="main-content"> + footer. `overflow-x-clip` keeps decorative glows from
 *  creating a horizontal scrollbar without breaking the sticky header (unlike overflow-hidden);
 *  `isolate` on <main> keeps `-z-10` decorative layers above the page background. */
export function MarketingShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={cx('relative isolate flex-1 focus:outline-none', className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cx(
        'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-studio-orange',
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-transparent to-studio-orange" />
      {children}
    </p>
  );
}

/** Eyebrow + h2 + optional subtitle, centered by default. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cx(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className="mt-3 text-balance font-display text-[30px] font-bold leading-[1.1] tracking-tight text-studio-text sm:text-4xl lg:text-[44px]"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-studio-muted sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

/**
 * Fades content in once when it scrolls into view. Always renders the same element on server and
 * client (branching on useReducedMotion() would cause a hydration mismatch that leaves the SSR'd
 * `opacity: 0` in place); reduced-motion users get an opacity-only fade via
 * <MotionConfig reducedMotion="user"> on the page.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function MailLink({ className }: { className?: string }) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className={cx(
        'rounded font-medium text-studio-orange underline decoration-studio-orange/40 underline-offset-4 transition-colors hover:text-studio-amber hover:decoration-studio-amber',
        className,
      )}
    >
      {SUPPORT_EMAIL}
    </a>
  );
}

/** Renders a translated string, turning every occurrence of the support email into a mailto link. */
export function WithEmailLink({ text }: { text: string }) {
  const parts = text.split(SUPPORT_EMAIL);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <MailLink /> : null}
        </span>
      ))}
    </>
  );
}
