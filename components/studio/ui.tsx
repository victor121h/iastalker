'use client';

// Shared UI kit for the Studio. Dark, red→orange "fire" aesthetic. Reuse these instead of
// re-styling primitives in each page.
import Link from 'next/link';
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { BRAND_NAME } from '@/lib/studio/plans';
import { useI18n } from '@/lib/studio/i18n/client';
import { IconAlert, IconCheck, IconClose, IconCrown, IconEye, IconEyeOff, IconFlame, IconGlobe } from './icons';

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ── Buttons ──────────────────────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'studio-gradient-bg text-white font-semibold studio-glow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:hover:brightness-100',
  secondary:
    'bg-studio-elevated text-studio-text border border-studio-line hover:border-studio-red/50 hover:bg-[#22121a] disabled:opacity-50',
  outline:
    'bg-transparent text-studio-text border border-studio-red/60 hover:bg-studio-red/10 disabled:opacity-50',
  ghost: 'bg-transparent text-studio-muted hover:text-studio-text hover:bg-white/5 disabled:opacity-50',
  danger: 'bg-studio-crimson/90 text-white hover:bg-studio-crimson disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-[15px] rounded-xl gap-2',
  lg: 'h-14 px-7 text-base rounded-2xl gap-2.5',
};

export function buttonClasses(opts: { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string } = {}) {
  return cx(
    'inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 select-none disabled:cursor-not-allowed',
    VARIANTS[opts.variant ?? 'primary'],
    SIZES[opts.size ?? 'md'],
    opts.fullWidth && 'w-full',
    opts.className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Spinner size={size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </Link>
  );
}

// ── Form controls ────────────────────────────────────────────────────────────────────────────
const inputBase =
  'w-full h-12 rounded-xl bg-studio-surface border border-studio-line px-4 text-[15px] text-studio-text placeholder:text-studio-subtle transition-colors focus:outline-none focus:border-studio-orange/80 focus:ring-2 focus:ring-studio-red/25 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(inputBase, invalid && 'border-studio-red/80', className)}
        {...rest}
      />
    );
  },
);

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function PasswordInput({ className, invalid, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          className={cx(inputBase, 'pr-12', invalid && 'border-studio-red/80', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-studio-subtle hover:text-studio-text"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
    );
  },
);

/** Label + control + optional hint/error. Pass a render function to receive the generated id. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-studio-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-sm text-studio-red" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-studio-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className="flex items-start gap-3 cursor-pointer text-sm text-studio-muted">
      <span className="relative mt-0.5 flex-none">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cx(
            'flex h-5 w-5 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-studio-orange',
            checked ? 'studio-gradient-bg border-transparent text-white' : 'border-studio-line bg-studio-surface',
          )}
        >
          {checked && <IconCheck size={14} strokeWidth={3} />}
        </span>
      </span>
      <span className="leading-snug">{children}</span>
    </label>
  );
}

// ── Surfaces & feedback ──────────────────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl bg-studio-surface border border-studio-line', className)}>{children}</div>;
}

export function Badge({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: 'hot' | 'neutral' | 'vip' | 'success' | 'outline';
  className?: string;
  children: ReactNode;
}) {
  const styles = {
    hot: 'studio-gradient-bg text-white shadow-[0_4px_18px_-4px_rgba(255,31,75,0.7)]',
    neutral: 'bg-white/5 text-studio-muted border border-studio-line',
    vip: 'bg-gradient-to-r from-studio-gold to-studio-amber text-[#2a1600]',
    success: 'bg-studio-success/15 text-studio-success border border-studio-success/30',
    outline: 'border border-studio-red/50 text-studio-orange',
  }[variant];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
        styles,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cx('animate-spin', className)}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Alert({
  variant = 'error',
  children,
  className,
}: {
  variant?: 'error' | 'success' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    error: 'border-studio-red/40 bg-studio-red/10 text-[#ffc2cd]',
    success: 'border-studio-success/40 bg-studio-success/10 text-[#b9f5da]',
    info: 'border-studio-orange/40 bg-studio-orange/10 text-[#ffd9b8]',
  }[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cx('flex gap-2.5 rounded-xl border px-4 py-3 text-sm', styles, className)}>
      {variant === 'success' ? (
        <IconCheck size={18} className="flex-none mt-px" />
      ) : (
        <IconAlert size={18} className="flex-none mt-px" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  labelledBy,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  labelledBy?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          'relative w-full max-h-[92vh] overflow-y-auto studio-scroll rounded-t-3xl sm:rounded-3xl bg-studio-surface border border-studio-line shadow-2xl',
          width,
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-studio-subtle hover:bg-white/5 hover:text-studio-text"
          aria-label="Close"
        >
          <IconClose size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Brand ────────────────────────────────────────────────────────────────────────────────────
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/studio/logo-mark.webp"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cx('select-none object-contain drop-shadow-[0_4px_14px_rgba(255,74,43,0.45)]', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** Full brand artwork (emblem + "Take It All App" lettering). */
export function LogoFull({ size = 220, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/studio/logo.webp"
      alt={BRAND_NAME}
      width={size}
      height={Math.round(size * 1.02)}
      className={cx('select-none object-contain', className)}
      style={{ width: size, height: 'auto' }}
      draggable={false}
    />
  );
}

export function Logo({ href = '/studio', size = 32, className }: { href?: string | null; size?: number; className?: string }) {
  const content = (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="font-display text-xl font-extrabold tracking-tight studio-gradient-text">{BRAND_NAME}</span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label={BRAND_NAME} className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}

export function CreditPill({ credits, className, onClick }: { credits: number; className?: string; onClick?: () => void }) {
  const { t } = useI18n();
  const content = (
    <>
      <IconFlame size={16} className="text-studio-orange" />
      <span className="tabular-nums font-semibold text-studio-text">{credits.toLocaleString()}</span>
      <span className="text-studio-subtle">{t('common.credits')}</span>
    </>
  );
  const cls = cx(
    'inline-flex items-center gap-1.5 rounded-full border border-studio-line bg-studio-surface px-3 h-9 text-sm',
    onClick && 'hover:border-studio-red/50 transition-colors',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  ) : (
    <span className={cls}>{content}</span>
  );
}

export function VipBadge({ className }: { className?: string }) {
  return (
    <Badge variant="vip" className={className}>
      <IconCrown size={12} strokeWidth={2.4} /> VIP
    </Badge>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 h-9 text-sm text-studio-muted hover:text-studio-text hover:bg-white/5 transition-colors',
        className,
      )}
      aria-label={t('common.language')}
      title={t('common.language')}
    >
      <IconGlobe size={16} />
      <span className="font-medium uppercase">{lang === 'en' ? 'EN' : 'PT'}</span>
    </button>
  );
}
