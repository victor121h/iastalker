'use client';

// Building blocks shared by the account page sections.
import { useId, type ReactNode } from 'react';
import { cx } from '@/components/studio/ui';

/** A titled account section (card) that is also an in-page navigation target. */
export function AccountSection({
  id,
  icon,
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  id: string;
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={cx(
        'scroll-mt-32 rounded-3xl border border-studio-line bg-studio-surface/90 focus:outline-none lg:scroll-mt-24',
        className,
      )}
    >
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-studio-line/80 px-5 py-4 sm:px-6 sm:py-5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-studio-red/20 bg-studio-fire-soft text-studio-orange"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight text-studio-text">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-sm text-studio-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cx('px-5 py-5 sm:px-6 sm:py-6', bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-studio-line px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-studio-subtle"
      >
        {icon}
      </span>
      <p className="mt-4 font-display text-base font-semibold text-studio-text">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-studio-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Read-only label/value pair used in the profile section. */
export function InfoItem({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-studio-muted">{label}</p>
      <div className="mt-1.5 text-[15px] text-studio-text">{children}</div>
    </div>
  );
}

/** "Show more / show less" toggle for long lists. */
export function ShowMoreButton({
  expanded,
  hiddenCount,
  onToggle,
  controls,
  moreLabel,
  lessLabel,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
  controls: string;
  moreLabel: string;
  lessLabel: string;
}) {
  if (!expanded && hiddenCount <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-studio-line text-sm font-medium text-studio-muted transition-colors hover:border-studio-red/40 hover:bg-white/[0.03] hover:text-studio-text"
    >
      {expanded ? lessLabel : moreLabel}
    </button>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('studio-shimmer rounded-xl', className)} />;
}
