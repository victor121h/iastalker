'use client';

import { forwardRef, type ReactNode } from 'react';
import { SUPPORT_EMAIL } from '@/lib/studio/plans';
import { Card, cx } from '@/components/studio/ui';

/** Centered card used by every checkout state (confirming, success, slow, failed, notices). */
export const StatusPanel = forwardRef<
  HTMLHeadingElement,
  {
    emblem: ReactNode;
    eyebrow?: ReactNode;
    title: ReactNode;
    children?: ReactNode;
    className?: string;
    glow?: 'fire' | 'amber' | 'none';
  }
>(function StatusPanel({ emblem, eyebrow, title, children, className, glow = 'fire' }, headingRef) {
  return (
    <Card className={cx('relative mx-auto w-full max-w-xl overflow-hidden text-center studio-noise', className)}>
      {glow !== 'none' && (
        <div
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute -top-24 left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-full blur-3xl',
            glow === 'fire' ? 'bg-studio-fire opacity-[0.16]' : 'bg-studio-amber opacity-[0.10]',
          )}
        />
      )}
      <div className="relative px-5 pb-9 pt-10 sm:px-10 sm:pb-11 sm:pt-12">
        <div className="flex justify-center">{emblem}</div>
        {eyebrow && (
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-studio-orange">{eyebrow}</p>
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cx(
            'font-display text-2xl font-bold tracking-tight text-studio-text focus:outline-none sm:text-3xl',
            eyebrow ? 'mt-2' : 'mt-7',
          )}
        >
          {title}
        </h1>
        {children}
      </div>
    </Card>
  );
});

/** Round icon emblem for the non-celebratory states. */
export function Emblem({ tone, children }: { tone: 'fire' | 'amber' | 'red' | 'neutral'; children: ReactNode }) {
  const styles = {
    fire: 'studio-gradient-bg text-white studio-glow',
    amber: 'bg-studio-amber/15 text-studio-amber border border-studio-amber/40',
    red: 'bg-studio-red/15 text-studio-red border border-studio-red/40',
    neutral: 'bg-studio-elevated text-studio-muted border border-studio-line',
  }[tone];
  return (
    <span className={cx('flex h-20 w-20 items-center justify-center rounded-full', styles)} aria-hidden="true">
      {children}
    </span>
  );
}

/** Renders a message containing `{email}` with a mailto link to the support address. */
export function SupportLine({ template, className }: { template: string; className?: string }) {
  const [before, after = ''] = template.split('{email}');
  return (
    <p className={cx('text-sm text-studio-muted', className)}>
      {before}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="font-medium text-studio-orange underline decoration-studio-orange/40 underline-offset-4 hover:decoration-studio-orange"
      >
        {SUPPORT_EMAIL}
      </a>
      {after}
    </p>
  );
}
