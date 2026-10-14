// Server-only credit accounting. Every balance change goes through these helpers so the
// studio_credit_ledger always explains the current balance. Always call inside a transaction.
import type { PoolClient } from 'pg';
import type { LedgerReason } from './types';
import { getPlan, isPlanId, tierRank, type Tier } from './plans';

interface Ref {
  type: string;
  id: string;
}

async function writeLedger(c: PoolClient, userId: string, delta: number, balanceAfter: number, reason: LedgerReason, ref?: Ref) {
  await c.query(
    `INSERT INTO studio_credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, delta, balanceAfter, reason, ref?.type ?? null, ref?.id ?? null],
  );
}

/**
 * Atomically removes `amount` credits. Returns the new balance, or null when the user does not
 * have enough credits (nothing is changed in that case).
 */
export async function debitCredits(
  c: PoolClient,
  userId: string,
  amount: number,
  reason: LedgerReason,
  ref?: Ref,
): Promise<number | null> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid debit amount: ${amount}`);
  const { rows } = await c.query<{ credits: number }>(
    `UPDATE studio_users SET credits = credits - $2, updated_at = NOW()
      WHERE id = $1 AND credits >= $2
      RETURNING credits`,
    [userId, amount],
  );
  if (!rows[0]) return null;
  const balance = Number(rows[0].credits);
  await writeLedger(c, userId, -amount, balance, reason, ref);
  return balance;
}

/** Adds credits and returns the new balance. */
export async function addCredits(
  c: PoolClient,
  userId: string,
  amount: number,
  reason: LedgerReason,
  ref?: Ref,
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid credit amount: ${amount}`);
  const { rows } = await c.query<{ credits: number }>(
    `UPDATE studio_users SET credits = credits + $2, updated_at = NOW() WHERE id = $1 RETURNING credits`,
    [userId, amount],
  );
  if (!rows[0]) throw new Error(`User ${userId} not found`);
  const balance = Number(rows[0].credits);
  await writeLedger(c, userId, amount, balance, reason, ref);
  return balance;
}

/**
 * Gives back the credits of a failed generation exactly once (guarded by the `refunded` flag).
 * Returns the new balance, or null if it was already refunded / does not exist.
 */
export async function refundGeneration(c: PoolClient, generationId: string): Promise<number | null> {
  const { rows } = await c.query<{ user_id: string; cost: number }>(
    `UPDATE studio_generations SET refunded = TRUE, updated_at = NOW()
      WHERE id = $1 AND refunded = FALSE AND status = 'failed'
      RETURNING user_id, cost`,
    [generationId],
  );
  const row = rows[0];
  if (!row || Number(row.cost) <= 0) return null;
  return addCredits(c, String(row.user_id), Number(row.cost), 'refund', { type: 'generation', id: generationId });
}

/** Raises the user's tier to `planId` if it is higher than the current one. */
export async function bumpTier(c: PoolClient, userId: string, planId: string): Promise<void> {
  if (!isPlanId(planId)) return;
  const { rows } = await c.query<{ tier: string }>('SELECT tier FROM studio_users WHERE id = $1 FOR UPDATE', [userId]);
  const current = (rows[0]?.tier || 'free') as Tier;
  const currentRank = current === 'free' || isPlanId(current) ? tierRank(current) : 0;
  if (getPlan(planId).rank > currentRank) {
    await c.query('UPDATE studio_users SET tier = $2, updated_at = NOW() WHERE id = $1', [userId, planId]);
  }
}
