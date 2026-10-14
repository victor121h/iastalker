// Typed browser-side client for the /api/studio endpoints. This file IS the API contract:
// every route handler must accept and return exactly these shapes.
import type { AspectRatio, GenerationType, PlanId } from './plans';
import type { Lang } from './i18n/define';
import type {
  ApiErrorBody,
  ApiErrorCode,
  ConversationDTO,
  GenerationDTO,
  LedgerEntryDTO,
  PaymentDTO,
  PublicUser,
} from './types';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | 'network',
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('network', 0, 'Network error');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code || 'internal', res.status, err?.message || `HTTP ${res.status}`, err?.details);
  }
  return data as T;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  lang: Lang;
}

export interface GenerateInput {
  /** Omit/null to start a new conversation (the response returns it). */
  conversationId?: string | null;
  type: GenerationType;
  prompt: string;
  aspectRatio: AspectRatio;
  /** A data URL (image/jpeg|png|webp) of an uploaded reference image. */
  referenceImage?: string | null;
  /** Use the result of one of the user's previous *image* generations as the reference. */
  referenceGenerationId?: string | null;
}

export const studioApi = {
  // ── Auth ─────────────────────────────────────────────────────────── /api/studio/auth/*
  me: () => request<{ user: PublicUser | null }>('GET', '/api/studio/auth/me'),
  signup: (input: SignupInput) => request<{ user: PublicUser }>('POST', '/api/studio/auth/signup', input),
  login: (input: { email: string; password: string }) =>
    request<{ user: PublicUser }>('POST', '/api/studio/auth/login', input),
  logout: () => request<{ ok: true }>('POST', '/api/studio/auth/logout', {}),
  /** Always resolves { ok: true } (never reveals whether the email exists). */
  forgotPassword: (input: { email: string; lang: Lang }) =>
    request<{ ok: true }>('POST', '/api/studio/auth/forgot', input),
  /** Sets the new password, invalidates other sessions and logs the user in. */
  resetPassword: (input: { token: string; password: string }) =>
    request<{ user: PublicUser }>('POST', '/api/studio/auth/reset', input),

  // ── Account ──────────────────────────────────────────────────────── /api/studio/account*
  account: () =>
    request<{ user: PublicUser; ledger: LedgerEntryDTO[]; payments: PaymentDTO[] }>('GET', '/api/studio/account'),
  updateAccount: (input: { name?: string; lang?: Lang }) =>
    request<{ user: PublicUser }>('PATCH', '/api/studio/account', input),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('POST', '/api/studio/account/password', input),

  // ── Conversations ────────────────────────────────────────────────── /api/studio/conversations*
  listConversations: () => request<{ conversations: ConversationDTO[] }>('GET', '/api/studio/conversations'),
  getConversation: (id: string) =>
    request<{ conversation: ConversationDTO; generations: GenerationDTO[] }>(
      'GET',
      `/api/studio/conversations/${encodeURIComponent(id)}`,
    ),
  renameConversation: (id: string, title: string) =>
    request<{ conversation: ConversationDTO }>('PATCH', `/api/studio/conversations/${encodeURIComponent(id)}`, {
      title,
    }),
  deleteConversation: (id: string) =>
    request<{ ok: true }>('DELETE', `/api/studio/conversations/${encodeURIComponent(id)}`),

  // ── Generation ───────────────────────────────────────────────────── /api/studio/generate, /generations/:id
  /** Debits credits and queues the job. 402 insufficient_credits, 422 prompt_blocked, 429 too_many_active. */
  generate: (input: GenerateInput) =>
    request<{ generation: GenerationDTO; conversation: ConversationDTO; balance: number }>(
      'POST',
      '/api/studio/generate',
      input,
    ),
  /** Polls a generation; the server advances it with the AI provider and refunds failures. */
  getGeneration: (id: string) =>
    request<{ generation: GenerationDTO; balance: number }>('GET', `/api/studio/generations/${encodeURIComponent(id)}`),

  // ── Payments ─────────────────────────────────────────────────────── /api/studio/checkout*
  /** Returns the URL to send the browser to (Stripe Checkout, PerfectPay link or the dev page). */
  checkout: (input: { planId: PlanId }) => request<{ url: string }>('POST', '/api/studio/checkout', input),
  /** Dev/simulated purchases only (STUDIO_DEV_PURCHASES). */
  devCompletePurchase: (input: { planId: PlanId }) =>
    request<{ ok: true; balance: number; payment: PaymentDTO }>('POST', '/api/studio/checkout/dev', input),
};

export type StudioApi = typeof studioApi;
