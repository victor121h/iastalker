'use client';

// Accessible accordion (WAI-ARIA accordion pattern): each question is a <button> inside a
// heading with aria-expanded / aria-controls; answers are labelled regions that stay in the DOM
// (crawlable) and are hidden from assistive tech with `visibility: hidden` while collapsed.
import { useId, useState, type ReactNode } from 'react';
import { cx } from '@/components/studio/ui';
import { IconPlus } from '@/components/studio/icons';

export interface FaqItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export function Faq({
  items,
  defaultOpen = null,
  headingLevel = 3,
  className,
}: {
  items: FaqItem[];
  /** Id of the item expanded initially (null = all closed). */
  defaultOpen?: string | null;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => (defaultOpen ? { [defaultOpen]: true } : {}));
  const baseId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <div
      className={cx(
        'divide-y divide-studio-line overflow-hidden rounded-3xl border border-studio-line bg-studio-surface/60',
        className,
      )}
    >
      {items.map((item) => {
        const expanded = !!open[item.id];
        const buttonId = `${baseId}-q-${item.id}`;
        const panelId = `${baseId}-a-${item.id}`;
        return (
          <div key={item.id} className={cx('transition-colors duration-200', expanded && 'bg-white/[0.025]')}>
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))}
                className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold text-studio-text transition-colors hover:bg-white/[0.03] sm:px-7 sm:text-base"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex h-8 w-8 flex-none items-center justify-center rounded-full border transition-all duration-200',
                    expanded
                      ? 'rotate-45 border-transparent studio-gradient-bg text-white'
                      : 'border-studio-line text-studio-muted group-hover:border-studio-red/50 group-hover:text-studio-text',
                  )}
                >
                  <IconPlus size={16} strokeWidth={2.2} />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cx(
                'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out',
                expanded ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-6 pr-14 text-[15px] leading-relaxed text-studio-muted sm:px-7 sm:pr-20">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
