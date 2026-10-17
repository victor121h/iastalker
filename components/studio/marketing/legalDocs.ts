// Structure of the legal pages. The copy lives in lib/studio/i18n/messages/legal.ts; this file
// only says which keys make up each section and how they are laid out.
import type { MessageKey } from '@/lib/studio/i18n';

export type LegalDocId = 'terms' | 'privacy';

/** Date shown as "Last updated" (ISO, UTC). Bump it whenever the legal copy changes. */
export const LEGAL_UPDATED = '2026-10-14';

export type LegalBlock =
  | { kind: 'p'; key: MessageKey }
  | { kind: 'list'; keys: MessageKey[]; emphasizeFirst?: boolean };

export interface LegalSection {
  /** Anchor id (stable — linked from other pages, e.g. /studio/terms#content-policy). */
  id: string;
  title: MessageKey;
  blocks: LegalBlock[];
  /** Visually highlighted section (the Content Policy). */
  highlight?: boolean;
}

export interface LegalDoc {
  eyebrow: MessageKey;
  title: MessageKey;
  intro: MessageKey;
  summaryTitle: MessageKey;
  summary: MessageKey[];
  sections: LegalSection[];
  related: { href: string; label: 'common.terms' | 'common.privacy' };
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    eyebrow: 'legal.terms.eyebrow',
    title: 'legal.terms.title',
    intro: 'legal.terms.intro',
    summaryTitle: 'legal.terms.summaryTitle',
    summary: ['legal.terms.summary1', 'legal.terms.summary2', 'legal.terms.summary3', 'legal.terms.summary4'],
    related: { href: '/studio/privacy', label: 'common.privacy' },
    sections: [
      {
        id: 'eligibility',
        title: 'legal.terms.eligibility.title',
        blocks: [{ kind: 'p', key: 'legal.terms.eligibility.p1' }],
      },
      {
        id: 'account',
        title: 'legal.terms.account.title',
        blocks: [{ kind: 'p', key: 'legal.terms.account.p1' }],
      },
      {
        id: 'content-policy',
        title: 'legal.terms.policy.title',
        highlight: true,
        blocks: [
          { kind: 'p', key: 'legal.terms.policy.intro' },
          {
            kind: 'list',
            emphasizeFirst: true,
            keys: [
              'legal.terms.policy.minors',
              'legal.terms.policy.consent',
              'legal.terms.policy.undress',
              'legal.terms.policy.deepfakes',
              'legal.terms.policy.rights',
              'legal.terms.policy.harassment',
              'legal.terms.policy.illegal',
            ],
          },
          { kind: 'p', key: 'legal.terms.policy.enforcement' },
        ],
      },
      {
        id: 'your-content',
        title: 'legal.terms.content.title',
        blocks: [
          { kind: 'p', key: 'legal.terms.content.p1' },
          { kind: 'p', key: 'legal.terms.content.p2' },
        ],
      },
      {
        id: 'credits-payments',
        title: 'legal.terms.credits.title',
        blocks: [
          {
            kind: 'list',
            keys: [
              'legal.terms.credits.usd',
              'legal.terms.credits.oneTime',
              'legal.terms.credits.costs',
              'legal.terms.credits.noExpiry',
              'legal.terms.credits.refundFailed',
              'legal.terms.credits.noRefundUsed',
              'legal.terms.credits.processor',
              'legal.terms.credits.billing',
            ],
          },
        ],
      },
      {
        id: 'availability',
        title: 'legal.terms.service.title',
        blocks: [{ kind: 'p', key: 'legal.terms.service.p1' }],
      },
      {
        id: 'termination',
        title: 'legal.terms.termination.title',
        blocks: [{ kind: 'p', key: 'legal.terms.termination.p1' }],
      },
      {
        id: 'disclaimer',
        title: 'legal.terms.disclaimer.title',
        blocks: [
          { kind: 'p', key: 'legal.terms.disclaimer.p1' },
          { kind: 'p', key: 'legal.terms.disclaimer.p2' },
        ],
      },
      {
        id: 'contact',
        title: 'legal.terms.contact.title',
        blocks: [{ kind: 'p', key: 'legal.terms.contact.p1' }],
      },
    ],
  },
  privacy: {
    eyebrow: 'legal.privacy.eyebrow',
    title: 'legal.privacy.title',
    intro: 'legal.privacy.intro',
    summaryTitle: 'legal.privacy.summaryTitle',
    summary: ['legal.privacy.summary1', 'legal.privacy.summary2', 'legal.privacy.summary3', 'legal.privacy.summary4'],
    related: { href: '/studio/terms', label: 'common.terms' },
    sections: [
      {
        id: 'what-we-store',
        title: 'legal.privacy.collect.title',
        blocks: [
          {
            kind: 'list',
            keys: [
              'legal.privacy.collect.account',
              'legal.privacy.collect.prompts',
              'legal.privacy.collect.references',
              'legal.privacy.collect.results',
              'legal.privacy.collect.payments',
              'legal.privacy.collect.technical',
            ],
          },
        ],
      },
      {
        id: 'why',
        title: 'legal.privacy.use.title',
        blocks: [
          {
            kind: 'list',
            keys: [
              'legal.privacy.use.service',
              'legal.privacy.use.payments',
              'legal.privacy.use.safety',
              'legal.privacy.use.emails',
            ],
          },
          { kind: 'p', key: 'legal.privacy.use.noSell' },
        ],
      },
      {
        id: 'processors',
        title: 'legal.privacy.providers.title',
        blocks: [{ kind: 'p', key: 'legal.privacy.providers.p1' }],
      },
      {
        id: 'retention',
        title: 'legal.privacy.retention.title',
        blocks: [
          { kind: 'p', key: 'legal.privacy.retention.p1' },
          { kind: 'p', key: 'legal.privacy.retention.p2' },
        ],
      },
      {
        id: 'cookies',
        title: 'legal.privacy.cookies.title',
        blocks: [
          { kind: 'list', keys: ['legal.privacy.cookies.session', 'legal.privacy.cookies.lang'] },
          { kind: 'p', key: 'legal.privacy.cookies.p1' },
        ],
      },
      {
        id: 'security',
        title: 'legal.privacy.security.title',
        blocks: [{ kind: 'p', key: 'legal.privacy.security.p1' }],
      },
      {
        id: 'rights',
        title: 'legal.privacy.rights.title',
        blocks: [{ kind: 'p', key: 'legal.privacy.rights.p1' }],
      },
      {
        id: 'adults-only',
        title: 'legal.privacy.minors.title',
        blocks: [{ kind: 'p', key: 'legal.privacy.minors.p1' }],
      },
      {
        id: 'contact',
        title: 'legal.privacy.contact.title',
        blocks: [{ kind: 'p', key: 'legal.privacy.contact.p1' }],
      },
    ],
  },
};
