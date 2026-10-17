'use client';

import { cx } from '@/components/studio/ui';
import { useI18n } from '@/lib/studio/i18n/client';
import type { MessageKey } from '@/lib/studio/i18n';
import { passwordStrength, type StrengthLevel } from './validation';

const LEVELS: Record<StrengthLevel, { key: MessageKey; bar: string; text: string }> = {
  0: { key: 'auth.strength.tooShort', bar: 'bg-studio-subtle', text: 'text-studio-subtle' },
  1: { key: 'auth.strength.weak', bar: 'bg-studio-red', text: 'text-studio-red' },
  2: { key: 'auth.strength.fair', bar: 'bg-studio-orange', text: 'text-studio-orange' },
  3: { key: 'auth.strength.good', bar: 'bg-studio-amber', text: 'text-studio-amber' },
  4: { key: 'auth.strength.strong', bar: 'bg-studio-success', text: 'text-studio-success' },
};

/** Four-segment strength meter shown under a new-password field (hidden while empty). */
export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const { t } = useI18n();
  if (!password) return null;
  const level = passwordStrength(password);
  const meta = LEVELS[level];
  const label = t(meta.key);
  // "Too short" still lights one dim segment so the meter never looks broken.
  const filled = Math.max(level, 1);

  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div
        role="meter"
        aria-label={t('auth.strength.label')}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={level}
        aria-valuetext={label}
        className="grid flex-1 grid-cols-4 gap-1.5"
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cx('h-1.5 rounded-full transition-colors duration-200', i <= filled ? meta.bar : 'bg-white/[0.08]')}
          />
        ))}
      </div>
      <span className={cx('min-w-[4.5rem] text-right text-xs font-medium', meta.text)} aria-live="polite">
        {label}
      </span>
    </div>
  );
}
