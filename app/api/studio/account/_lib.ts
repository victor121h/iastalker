// Helpers for the /api/studio/account route handlers (not a route itself).
// Row → DTO mappers are kept local on purpose so the account slice does not depend on the
// payments module's internals.
import { isPlanId } from '@/lib/studio/plans';
import type { LedgerEntryDTO, LedgerReason, PaymentDTO, PaymentProvider, PaymentStatus } from '@/lib/studio/types';

export const MINUTE = 60 * 1000;

export interface LedgerRow {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: Date;
}

export interface AccountPaymentRow {
  id: string;
  provider: string;
  plan_id: string;
  credits: number;
  amount_cents: number;
  currency: string | null;
  status: string;
  created_at: Date;
}

const LEDGER_REASONS: LedgerReason[] = ['signup_bonus', 'purchase', 'generation', 'refund', 'adjustment'];
const PAYMENT_PROVIDERS: PaymentProvider[] = ['stripe', 'perfectpay', 'dev'];
/** Statuses shown in the purchase history (failed / abandoned checkouts are bookkeeping noise). */
export const VISIBLE_PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'refunded', 'pending'];

export function ledgerToDTO(row: LedgerRow): LedgerEntryDTO {
  return {
    id: String(row.id),
    delta: Number(row.delta),
    balanceAfter: Number(row.balance_after),
    reason: (LEDGER_REASONS as string[]).includes(row.reason) ? (row.reason as LedgerReason) : 'adjustment',
    refType: row.ref_type ?? null,
    refId: row.ref_id ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Returns null for rows that cannot be represented safely (unknown plan / provider / status). */
export function paymentToAccountDTO(row: AccountPaymentRow): PaymentDTO | null {
  if (!isPlanId(row.plan_id)) return null;
  if (!(PAYMENT_PROVIDERS as string[]).includes(row.provider)) return null;
  if (!(VISIBLE_PAYMENT_STATUSES as string[]).includes(row.status)) return null;
  return {
    id: String(row.id),
    provider: row.provider as PaymentProvider,
    planId: row.plan_id,
    credits: Number(row.credits),
    amountCents: Number(row.amount_cents),
    currency: (row.currency || 'usd').toLowerCase(),
    status: row.status as PaymentStatus,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
