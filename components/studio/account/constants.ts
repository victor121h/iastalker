// Limits shared by the account page (client validation) and the /api/studio/account routes.
// Plain module (no 'use client', no server imports) so both sides can import it.

/** Max length of a display name (same limit as sign-up). */
export const ACCOUNT_NAME_MAX = 80;

/** Mirrors PASSWORD_MIN / PASSWORD_MAX in lib/studio/auth.ts (server-only, not importable here). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

/** Ledger / payment rows returned by GET /api/studio/account. */
export const ACCOUNT_HISTORY_LIMIT = 50;

/**
 * Removes control / invisible formatting characters and collapses whitespace in a display name.
 * Used by the API (authoritative) and by the form to compare against the saved value.
 */
export function cleanDisplayName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
