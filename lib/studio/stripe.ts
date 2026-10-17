// Server-only Stripe helpers for the Studio (no SDK — plain REST over fetch).
//
// Everything here is a pure function of its arguments (no env, no DB), so it can be unit tested
// with plain node:
//   - buildCheckoutSessionParams / toFormBody   → the x-www-form-urlencoded Checkout payload
//   - checkoutIdempotencyKey                     → dedupes double clicks into one session
//   - stripeRequest / createCheckoutSession / retrieveCheckoutSession
//   - parseSignatureHeader / computeSignature / verifyStripeSignature / signatureHeaderFor
import crypto from 'crypto';

export const STRIPE_API_BASE = 'https://api.stripe.com/v1';
/** Max age (and max clock skew) of a signed webhook, in seconds. */
export const STRIPE_SIGNATURE_TOLERANCE_SEC = 300;
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Object shapes (only the fields the Studio reads) ─────────────────────────────────────────

export interface StripeCheckoutSession {
  id: string;
  object?: 'checkout.session';
  mode?: string;
  status?: 'open' | 'complete' | 'expired' | null;
  payment_status?: 'paid' | 'unpaid' | 'no_payment_required' | string;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  customer?: string | { id: string } | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
  livemode?: boolean;
  url?: string | null;
}

export interface StripeCharge {
  id: string;
  object?: 'charge';
  amount?: number;
  amount_refunded?: number;
  currency?: string;
  refunded?: boolean;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
}

export interface StripeEvent<T = unknown> {
  id: string;
  type: string;
  created?: number;
  livemode?: boolean;
  api_version?: string | null;
  data: { object: T };
}

// ── Form encoding ────────────────────────────────────────────────────────────────────────────

export type FormValue = string | number | boolean | null | undefined;

/** Encodes flat Stripe-style params (`line_items[0][quantity]`) as x-www-form-urlencoded. */
export function toFormBody(params: Record<string, FormValue>): string {
  const body = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) return;
    body.append(key, String(value));
  });
  return body.toString();
}

export interface CheckoutSessionInput {
  brandName: string;
  planId: string;
  planName: string;
  priceCents: number;
  credits: number;
  userId: string;
  email: string;
  /** Public base URL without a trailing slash, e.g. https://example.com */
  baseUrl: string;
  /** Stripe Checkout locale ('auto', 'en', 'pt-BR', …). */
  locale?: string;
}

/** The Checkout Session parameters for a one-time credit pack purchase. */
export function buildCheckoutSessionParams(input: CheckoutSessionInput): Record<string, string> {
  const base = input.baseUrl.replace(/\/+$/, '');
  const metadata = {
    user_id: input.userId,
    plan_id: input.planId,
    credits: String(input.credits),
  };
  const params: Record<string, string> = {
    mode: 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(input.priceCents),
    'line_items[0][price_data][product_data][name]': `${input.brandName} ${input.planName} — ${input.credits} credits`,
    'line_items[0][quantity]': '1',
    // {CHECKOUT_SESSION_ID} is substituted by Stripe (it must reach Stripe un-encoded after form decoding).
    success_url: `${base}/studio/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/studio/pricing?canceled=1`,
    client_reference_id: input.userId,
    customer_email: input.email,
    'metadata[user_id]': metadata.user_id,
    'metadata[plan_id]': metadata.plan_id,
    'metadata[credits]': metadata.credits,
    // Copied onto the PaymentIntent so refunds/disputes in the dashboard are traceable too.
    'payment_intent_data[metadata][user_id]': metadata.user_id,
    'payment_intent_data[metadata][plan_id]': metadata.plan_id,
    'payment_intent_data[metadata][credits]': metadata.credits,
  };
  if (input.locale) params.locale = input.locale;
  return params;
}

/**
 * Deterministic Idempotency-Key: identical parameters within the same time bucket map to the same
 * key, so a double click (or a client retry) returns the same Checkout Session instead of
 * creating two. Different parameters always get a different key (Stripe rejects key reuse with
 * different parameters).
 */
export function checkoutIdempotencyKey(
  params: Record<string, string>,
  opts: { bucketMs?: number; now?: number } = {},
): string {
  const bucketMs = opts.bucketMs ?? 60_000;
  const bucket = Math.floor((opts.now ?? Date.now()) / bucketMs);
  const fingerprint = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const digest = crypto.createHash('sha256').update(`${bucket}|${fingerprint}`).digest('hex');
  return `studio-checkout-${digest.slice(0, 48)}`;
}

// ── REST calls ───────────────────────────────────────────────────────────────────────────────

export class StripeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public type?: string,
    public code?: string,
    public requestId?: string | null,
  ) {
    super(message);
    this.name = 'StripeApiError';
  }
}

export interface StripeRequestOptions {
  idempotencyKey?: string;
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

/** Calls the Stripe REST API. Throws StripeApiError on network failures and non-2xx answers. */
export async function stripeRequest<T>(
  secretKey: string,
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, FormValue>,
  opts: StripeRequestOptions = {},
): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}` };
  let url = `${STRIPE_API_BASE}${path}`;
  let body: string | undefined;
  if (params && method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = toFormBody(params);
  } else if (params) {
    const qs = toFormBody(params);
    if (qs) url += `?${qs}`;
  }
  if (opts.idempotencyKey && method === 'POST') headers['Idempotency-Key'] = opts.idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await doFetch(url, { method, headers, body, signal: controller.signal, cache: 'no-store' });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new StripeApiError(`Stripe request failed: ${reason}`, 0, 'network_error');
  } finally {
    clearTimeout(timer);
  }

  const requestId = res.headers.get('request-id');
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON answer */
  }
  if (!res.ok) {
    const e = (data as { error?: { message?: string; type?: string; code?: string } } | null)?.error;
    throw new StripeApiError(e?.message || `Stripe HTTP ${res.status}`, res.status, e?.type, e?.code, requestId);
  }
  if (!data || typeof data !== 'object') {
    throw new StripeApiError('Stripe returned an empty response', res.status, 'api_error', undefined, requestId);
  }
  return data as T;
}

export async function createCheckoutSession(
  secretKey: string,
  params: Record<string, string>,
  opts: StripeRequestOptions = {},
): Promise<StripeCheckoutSession> {
  const session = await stripeRequest<StripeCheckoutSession>(secretKey, 'POST', '/checkout/sessions', params, opts);
  if (typeof session.id !== 'string' || typeof session.url !== 'string' || !/^https:\/\//.test(session.url)) {
    throw new StripeApiError('Stripe returned a Checkout Session without a URL', 200, 'api_error');
  }
  return session;
}

export function retrieveCheckoutSession(
  secretKey: string,
  sessionId: string,
  opts: StripeRequestOptions = {},
): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(
    secretKey,
    'GET',
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    opts,
  );
}

// ── Small accessors ──────────────────────────────────────────────────────────────────────────

/** Checkout Session ids look like cs_test_a1B2… / cs_live_a1B2…. */
export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_[A-Za-z0-9_]{8,250}$/.test(value);
}

export function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return typeof value.id === 'string' ? value.id : null;
}

/** The buyer's email as Stripe recorded it (lowercased), if any. */
export function sessionEmail(session: StripeCheckoutSession): string | null {
  const email = session.customer_details?.email || session.customer_email || null;
  return email ? email.trim().toLowerCase() : null;
}

// ── Webhook signatures ───────────────────────────────────────────────────────────────────────

export interface ParsedSignatureHeader {
  timestamp: number | null;
  signatures: string[];
}

/** Parses `t=1492774577,v1=5257a8…,v1=…,v0=…` (unknown schemes are ignored). */
export function parseSignatureHeader(header: string | null | undefined): ParsedSignatureHeader {
  const result: ParsedSignatureHeader = { timestamp: null, signatures: [] };
  if (!header) return result;
  for (const part of header.split(',')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === 't' && /^\d{1,15}$/.test(value)) result.timestamp = Number(value);
    else if (key === 'v1' && /^[0-9a-f]{64}$/i.test(value)) result.signatures.push(value.toLowerCase());
  }
  return result;
}

/** HMAC-SHA256(secret, `${timestamp}.${payload}`) as lowercase hex. */
export function computeSignature(secret: string, timestamp: number, payload: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export type SignatureFailure = 'missing_header' | 'malformed_header' | 'timestamp_out_of_tolerance' | 'no_matching_signature';

export type SignatureCheck = { ok: true; timestamp: number } | { ok: false; reason: SignatureFailure };

/**
 * Verifies a Stripe-Signature header against the raw request body. Accepts the event when ANY v1
 * signature matches (Stripe sends several while a webhook secret is being rolled) and the
 * timestamp is within `toleranceSec` of now.
 */
export function verifyStripeSignature(input: {
  payload: string;
  header: string | null | undefined;
  secret: string;
  toleranceSec?: number;
  /** Current time in seconds (injectable for tests). */
  nowSec?: number;
}): SignatureCheck {
  if (!input.header) return { ok: false, reason: 'missing_header' };
  const { timestamp, signatures } = parseSignatureHeader(input.header);
  if (timestamp === null || signatures.length === 0) return { ok: false, reason: 'malformed_header' };
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSec ?? STRIPE_SIGNATURE_TOLERANCE_SEC;
  if (Math.abs(now - timestamp) > tolerance) return { ok: false, reason: 'timestamp_out_of_tolerance' };
  const expected = computeSignature(input.secret, timestamp, input.payload);
  // Compare against every candidate (no early exit) to keep timing independent of the position.
  let matched = false;
  for (const sig of signatures) {
    if (safeEqualHex(expected, sig)) matched = true;
  }
  return matched ? { ok: true, timestamp } : { ok: false, reason: 'no_matching_signature' };
}

/** Builds a valid Stripe-Signature header (for tests and local tooling). */
export function signatureHeaderFor(secret: string, payload: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${computeSignature(secret, timestamp, payload)}`;
}
