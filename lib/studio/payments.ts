// Server-only payments module — OWNED BY THE PAYMENTS SLICE (this is a stub with the agreed signature).
import type { PoolClient } from 'pg';

/**
 * Called inside the sign-up transaction: credits any paid-but-unclaimed purchases made with this
 * email before the account existed (e.g. PerfectPay checkouts). Returns the credits added.
 */
export async function claimPendingPayments(_client: PoolClient, _userId: string, _email: string): Promise<number> {
  return 0;
}
