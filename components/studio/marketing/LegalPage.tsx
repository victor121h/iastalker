'use client';

// Renders /studio/terms and /studio/privacy from the structure in legalDocs.ts.
// Desktop: sticky table of contents + article (max-w-3xl). Mobile: collapsible contents.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/studio/i18n/client';
import type { Lang, MessageKey } from '@/lib/studio/i18n';
import { BRAND_NAME, GENERATION_COST, SUPPORT_EMAIL } from '@/lib/studio/plans';
import { cx } from '@/components/studio/ui';
import { IconAlert, IconArrowRight, IconCheck, IconChevronDown, IconMail } from '@/components/studio/icons';
import { LEGAL_DOCS, LEGAL_UPDATED, type LegalBlock, type LegalDocId, type LegalSection } from './legalDocs';
import { Container, Eyebrow, MailLink, MarketingShell, WithEmailLink } from './shared';

const MIN_AGE = 18;

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
  } catch {
    return iso;
  }
}

/** Highlights the TOC entry of the section currently at the top of the viewport. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    const sectionIds = key.split('|');
    const elements = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length || typeof IntersectionObserver === 'undefined') return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        });
        let best: string | null = null;
        let bestTop = Infinity;
        visible.forEach((top, id) => {
          if (top < bestTop) {
            bestTop = top;
            best = id;
          }
        });
        if (best) setActive(best);
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

export function LegalPage({ doc: docId }: { doc: LegalDocId }) {
  const { t, lang } = useI18n();
  const doc = LEGAL_DOCS[docId];
  const vars = {
    brand: BRAND_NAME,
    email: SUPPORT_EMAIL,
    age: MIN_AGE,
    image: GENERATION_COST.image,
    video: GENERATION_COST.video,
  };
  const tx = (key: MessageKey) => t(key, vars);
  const active = useActiveSection(doc.sections.map((s) => s.id));

  const toc = (
    <ol className="space-y-0.5">
      {doc.sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            aria-current={active === section.id ? 'location' : undefined}
            className={cx(
              'flex gap-3 rounded-lg px-3 py-2 text-sm leading-snug transition-colors',
              active === section.id
                ? 'bg-white/[0.05] text-studio-text'
                : 'text-studio-muted hover:bg-white/[0.03] hover:text-studio-text',
            )}
          >
            <span className={cx('tabular-nums', active === section.id ? 'text-studio-orange' : 'text-studio-subtle')}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{tx(section.title)}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <MarketingShell>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[480px] w-[900px] max-w-[180%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,31,75,0.16),transparent)]" />
      </div>

      <Container className="pb-24 pt-10 sm:pb-32 sm:pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <nav aria-label={t('legal.toc')} className="sticky top-24">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-studio-subtle">
                {t('legal.toc')}
              </p>
              <div className="mt-3">{toc}</div>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <header>
              <Eyebrow>{tx(doc.eyebrow)}</Eyebrow>
              <h1 className="mt-4 text-balance font-display text-[34px] font-extrabold leading-[1.08] tracking-tight text-studio-text sm:text-5xl">
                {tx(doc.title)}
              </h1>
              <p className="mt-4 text-sm text-studio-subtle">
                <time dateTime={LEGAL_UPDATED}>{t('legal.updated', { date: formatDate(LEGAL_UPDATED, lang) })}</time>
              </p>
              <p className="mt-6 text-lg leading-relaxed text-studio-muted">{tx(doc.intro)}</p>
            </header>

            <div className="mt-8 rounded-3xl border border-studio-line bg-studio-surface/70 p-5 sm:p-6">
              <h2 className="font-display text-base font-bold text-studio-text">{tx(doc.summaryTitle)}</h2>
              <ul className="mt-4 space-y-2.5">
                {doc.summary.map((key) => (
                  <li key={key} className="flex items-start gap-3 text-[15px] leading-relaxed text-studio-muted">
                    <span
                      aria-hidden="true"
                      className="mt-1 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full studio-gradient-bg text-white"
                    >
                      <IconCheck size={11} strokeWidth={3} />
                    </span>
                    <span>{tx(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <details className="group mt-6 rounded-2xl border border-studio-line bg-studio-surface/50 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-studio-text [&::-webkit-details-marker]:hidden">
                {t('legal.toc')}
                <IconChevronDown size={18} className="text-studio-subtle transition-transform group-open:rotate-180" />
              </summary>
              <nav aria-label={t('legal.toc')} className="px-1 pb-3">
                {toc}
              </nav>
            </details>

            <div className="mt-10 space-y-12 sm:mt-12">
              {doc.sections.map((section, i) => (
                <Section key={section.id} section={section} index={i} tx={tx} />
              ))}
            </div>

            <footer className="mt-14 flex flex-col gap-4 rounded-3xl border border-studio-line bg-studio-surface/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="flex items-start gap-3 text-sm text-studio-muted">
                <IconMail size={18} className="mt-0.5 flex-none text-studio-orange" />
                <span>
                  {t('legal.contactCta')} <MailLink />
                </span>
              </p>
              <Link
                href={doc.related.href}
                className="inline-flex flex-none items-center gap-1.5 rounded text-sm font-semibold text-studio-orange transition-colors hover:text-studio-amber"
              >
                {t('legal.alsoRead')}: {t(doc.related.label)}
                <IconArrowRight size={16} />
              </Link>
            </footer>
          </article>
        </div>
      </Container>
    </MarketingShell>
  );
}

function Section({ section, index, tx }: { section: LegalSection; index: number; tx: (key: MessageKey) => string }) {
  const headingId = `${section.id}-title`;
  return (
    <section
      id={section.id}
      aria-labelledby={headingId}
      className={cx(
        'scroll-mt-24',
        section.highlight &&
          'studio-gradient-border rounded-3xl bg-[#150a0d] p-5 shadow-[0_30px_80px_-40px_rgba(255,31,75,0.5)] sm:p-7',
      )}
    >
      <h2
        id={headingId}
        className="flex items-baseline gap-3 font-display text-2xl font-bold tracking-tight text-studio-text sm:text-[28px]"
      >
        <span aria-hidden="true" className="text-base font-semibold tabular-nums text-studio-orange">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span>{tx(section.title)}</span>
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-studio-muted sm:text-base">
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} tx={tx} />
        ))}
      </div>
    </section>
  );
}

/** "Label — description" list items get a bold label (only when the label part is short). */
function LabelledText({ text }: { text: string }) {
  const at = text.indexOf(' — ');
  if (at > 0 && at <= 48) {
    return (
      <>
        <strong className="font-semibold text-studio-text">{text.slice(0, at)}</strong>
        <WithEmailLink text={text.slice(at)} />
      </>
    );
  }
  return <WithEmailLink text={text} />;
}

function Block({ block, tx }: { block: LegalBlock; tx: (key: MessageKey) => string }) {
  if (block.kind === 'p') {
    return (
      <p>
        <WithEmailLink text={tx(block.key)} />
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {block.keys.map((key, i) =>
        block.emphasizeFirst && i === 0 ? (
          <li
            key={key}
            className="flex items-start gap-3 rounded-2xl border border-studio-red/40 bg-studio-red/[0.08] p-4 text-[#ffd0d8]"
          >
            <IconAlert size={20} className="mt-0.5 flex-none text-studio-red" />
            <span className="font-medium">
              <LabelledText text={tx(key)} />
            </span>
          </li>
        ) : (
          <li key={key} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 flex-none rounded-full bg-studio-orange" />
            <span>
              <LabelledText text={tx(key)} />
            </span>
          </li>
        ),
      )}
    </ul>
  );
}
