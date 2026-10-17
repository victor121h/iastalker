'use client';

// Site footer for the marketing / account / checkout pages: brand, link groups, 18+ note,
// support email and copyright.
import Link from 'next/link';
import { useI18n } from '@/lib/studio/i18n/client';
import { BRAND_NAME, SUPPORT_EMAIL } from '@/lib/studio/plans';
import { useStudioSession } from './StudioProviders';
import { Logo, cx } from './ui';
import { IconMail, IconShield } from './icons';

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

export function SiteFooter({ className }: { className?: string }) {
  const { t } = useI18n();
  const { user } = useStudioSession();
  const year = new Date().getFullYear();

  const groups: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t('landing.footer.product'),
      links: [
        user
          ? { href: '/studio/chat', label: t('landing.nav.openStudio') }
          : { href: '/studio/signup', label: t('common.startCreating') },
        { href: '/studio/pricing', label: t('common.pricing') },
        { href: '/studio#faq', label: t('landing.footer.faq') },
      ],
    },
    {
      title: t('landing.footer.legal'),
      links: [
        { href: '/studio/terms', label: t('common.terms') },
        { href: '/studio/terms#content-policy', label: t('landing.footer.contentPolicy') },
        { href: '/studio/privacy', label: t('common.privacy') },
      ],
    },
    {
      title: t('landing.footer.help'),
      links: [
        { href: `mailto:${SUPPORT_EMAIL}`, label: t('common.support'), external: true },
        user
          ? { href: '/studio/account', label: t('common.account') }
          : { href: '/studio/login', label: t('common.login') },
      ],
    },
  ];

  const linkCls =
    'inline-flex min-h-[20px] items-center gap-1.5 rounded text-sm text-studio-muted transition-colors hover:text-studio-text';

  return (
    <footer className={cx('relative mt-auto border-t border-studio-line/80 bg-studio-bg/70', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-studio-red/50 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Logo size={32} />
            <p className="mt-4 text-sm leading-relaxed text-studio-muted">{t('landing.footer.tagline')}</p>
            <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-studio-line bg-studio-surface/60 p-3.5 text-xs leading-relaxed text-studio-muted">
              <span className="flex h-6 flex-none items-center justify-center rounded-md bg-studio-red/15 px-1.5 text-[11px] font-bold text-studio-red">
                18+
              </span>
              <span>{t('landing.footer.adultsNote')}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-studio-subtle">{group.title}</h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a href={link.href} className={linkCls}>
                          <IconMail size={15} />
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={linkCls}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-studio-line/80 pt-6 text-xs text-studio-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('landing.footer.copyright', { year, brand: BRAND_NAME })} {t('common.allRightsReserved')}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <IconShield size={14} />
              {t('common.adultsOnly')}
            </span>
            <span>{t('landing.footer.paymentsNote')}</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded transition-colors hover:text-studio-text">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
