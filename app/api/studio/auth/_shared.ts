// Helpers shared by the /api/studio/auth/* route handlers (not a route itself).
import type { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/studio/http';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Metadata stored with each session row. */
export function sessionMeta(req: NextRequest) {
  return { userAgent: req.headers.get('user-agent'), ip: getClientIp(req) };
}

/** Removes control characters and collapses runs of whitespace in a display name. */
export function cleanName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reset tokens are randomToken(32) → 43 base64url characters; accept a little slack. */
export const RESET_TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;
