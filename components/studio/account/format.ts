// Formatting helpers for the account page (client-safe, no React).
import type { Lang } from '@/lib/studio/i18n/define';
import type { MessageKey } from '@/lib/studio/i18n';
import { GENERATION_COST, PLANS, formatUSD, type GenerationType, type PlanId } from '@/lib/studio/plans';
import type { LedgerEntryDTO } from '@/lib/studio/types';

export function localeOf(lang: Lang): string {
  return lang === 'pt' ? 'pt-BR' : 'en-US';
}

function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(iso: string, lang: Lang): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function formatDate(iso: string, lang: Lang): string {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'long' }).format(d);
}

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(localeOf(lang)).format(n);
}

/** Money in the payment's currency; USD keeps the product-wide `$9.90` format. */
export function formatMoney(cents: number, currency: string, lang: Lang): string {
  const code = (currency || 'usd').toUpperCase();
  if (code === 'USD') return formatUSD(cents);
  try {
    return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: code }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function planName(id: PlanId | string): string {
  return PLANS.find((p) => p.id === id)?.name ?? String(id);
}

/**
 * The ledger does not store the generation type, but each generation is charged exactly its
 * type's cost (and refunds give back the same amount), so the amount identifies it. Entries
 * whose amount matches neither cost (e.g. after a price change) fall back to a generic label.
 */
export function generationTypeOf(entry: LedgerEntryDTO): GenerationType | null {
  const amount = Math.abs(entry.delta);
  if (amount === GENERATION_COST.video && amount !== GENERATION_COST.image) return 'video';
  if (amount === GENERATION_COST.image && amount !== GENERATION_COST.video) return 'image';
  return null;
}

export type LedgerKind =
  | 'signup_bonus'
  | 'purchase'
  | 'generation_image'
  | 'generation_video'
  | 'generation'
  | 'refund_image'
  | 'refund_video'
  | 'refund'
  | 'adjustment';

export function ledgerKind(entry: LedgerEntryDTO): LedgerKind {
  switch (entry.reason) {
    case 'signup_bonus':
    case 'purchase':
    case 'adjustment':
      return entry.reason;
    case 'generation': {
      const type = generationTypeOf(entry);
      return type ? `generation_${type}` : 'generation';
    }
    case 'refund': {
      const type = generationTypeOf(entry);
      return type ? `refund_${type}` : 'refund';
    }
    default:
      return 'adjustment';
  }
}

export const LEDGER_LABEL_KEY: Record<Exclude<LedgerKind, 'purchase'>, MessageKey> = {
  signup_bonus: 'account.activity.reason.signup_bonus',
  generation_image: 'account.activity.reason.generationImage',
  generation_video: 'account.activity.reason.generationVideo',
  generation: 'account.activity.reason.generation',
  refund_image: 'account.activity.reason.refundImage',
  refund_video: 'account.activity.reason.refundVideo',
  refund: 'account.activity.reason.refund',
  adjustment: 'account.activity.reason.adjustment',
};
