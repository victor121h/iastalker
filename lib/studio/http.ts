// Server-only helpers shared by every /api/studio route handler.
import { NextResponse, type NextRequest } from 'next/server';
import type { ApiErrorBody, ApiErrorCode } from './types';
import { ensureSchema } from './db';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message || code);
  }
}

export function jsonError(status: number, code: ApiErrorCode, message?: string, details?: Record<string, unknown>) {
  const body: ApiErrorBody = { error: { code, message: message || code, ...(details ? { details } : {}) } };
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function json<T>(data: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers || {}) },
  });
}

/** Reads and parses a JSON body; rejects non-JSON content types and oversized bodies. */
export async function readJson<T = Record<string, unknown>>(req: NextRequest, maxBytes = 64 * 1024): Promise<T> {
  const type = req.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'invalid_input', 'Expected application/json');
  }
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'invalid_input', 'Request body too large');
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as T;
  } catch {
    throw new HttpError(400, 'invalid_input', 'Invalid JSON body');
  }
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.ip || 'unknown';
}

/** Origin of the incoming request as seen by the browser (respects proxies). */
export function requestOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
}

/**
 * CSRF guard for cookie-authenticated mutations: when the browser sends an Origin header it must
 * match our host. Server-to-server calls (webhooks) send no Origin and pass through.
 */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'forbidden', 'Bad origin');
  }
  const allowed = new Set(
    [req.headers.get('x-forwarded-host'), req.headers.get('host'), req.nextUrl.host]
      .filter(Boolean)
      .flatMap((h) => (h as string).split(',').map((s) => s.trim())),
  );
  if (!allowed.has(originHost)) throw new HttpError(403, 'forbidden', 'Cross-origin request blocked');
}

// ── In-memory rate limiting (per process; good enough for a single instance) ─────────────────
const buckets = new Map<string, number[]>();

/** Returns true if allowed. Sliding window of `windowMs` with at most `limit` hits per key. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    buckets.forEach((v, k) => {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    });
  }
  return true;
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  if (!rateLimit(key, limit, windowMs)) {
    throw new HttpError(429, 'rate_limited', 'Too many requests, please slow down');
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler: ensures the schema exists, applies the same-origin check to mutations
 * and converts thrown HttpErrors (or unexpected errors) into JSON responses.
 *
 *   export const POST = route(async (req) => { ... });
 */
export function route<C = { params: Record<string, string> }>(handler: Handler<C>, opts: { skipOriginCheck?: boolean } = {}) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (!opts.skipOriginCheck && req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req);
      await ensureSchema();
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.status, err.code, err.message, err.details);
      console.error('[studio] Unhandled API error:', err);
      return jsonError(500, 'internal', 'Something went wrong. Please try again.');
    }
  };
}

// ── Small validation helpers ─────────────────────────────────────────────────────────────────
export function str(value: unknown, field: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string {
  if (value === undefined || value === null || value === '') {
    if (opts.optional) return '';
    throw new HttpError(400, 'invalid_input', `${field} is required`, { field });
  }
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_input', `${field} must be a string`, { field });
  const v = value.trim();
  if (opts.min !== undefined && v.length < opts.min) {
    throw new HttpError(400, 'invalid_input', `${field} is too short`, { field });
  }
  if (opts.max !== undefined && v.length > opts.max) {
    throw new HttpError(400, 'invalid_input', `${field} is too long`, { field });
  }
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown): string {
  const email = str(value, 'email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_input', 'Invalid email address', { field: 'email' });
  return email;
}
