'use client';

import { useI18n } from '@/lib/studio/i18n/client';
import { cx } from '@/components/studio/ui';
import { IconAlert } from '@/components/studio/icons';

/** Impossible-to-miss notice that the dev checkout does not charge anything. */
export function TestModeBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="note"
      className={cx(
        'relative overflow-hidden rounded-2xl border-2 border-dashed border-studio-amber/80 bg-studio-amber/10 px-4 py-3.5 sm:px-5 sm:py-4',
        className,
      )}
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,178,63,0.10) 0 14px, rgba(255,178,63,0) 14px 28px)',
      }}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-studio-amber text-[#2a1600] shadow-[0_6px_20px_-6px_rgba(255,178,63,0.7)]"
          aria-hidden="true"
        >
          <IconAlert size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-extrabold uppercase tracking-wider text-studio-amber sm:text-base">
            {t('checkout.testMode.title')}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-[#ffe2b3]">{t('checkout.testMode.body')}</p>
        </div>
      </div>
    </div>
  );
}
