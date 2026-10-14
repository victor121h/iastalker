// Shared DTOs exchanged between the Studio API routes and the client.
import type { AspectRatio, GenerationType, PlanId, Tier } from './plans';
import type { Lang } from './i18n/define';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  credits: number;
  tier: Tier;
  lang: Lang;
  createdAt: string;
}

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface GenerationDTO {
  id: string;
  conversationId: string;
  type: GenerationType;
  prompt: string;
  aspectRatio: AspectRatio;
  cost: number;
  status: GenerationStatus;
  /** Final media URL (image or mp4) when completed. */
  resultUrl: string | null;
  /** URL of the reference image used (uploaded file or a previous result). */
  referenceUrl: string | null;
  /** Machine-readable failure code (see ApiErrorCode) when status = failed. */
  errorCode: string | null;
  error: string | null;
  /** True once the credits for a failed generation were given back. */
  refunded: boolean;
  /** Provider queue position, when known. */
  queuePosition: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ConversationDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  generationCount: number;
  /** Last completed image result (for sidebar thumbnails), if any. */
  previewUrl: string | null;
}

export type LedgerReason = 'signup_bonus' | 'purchase' | 'generation' | 'refund' | 'adjustment';

export interface LedgerEntryDTO {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: LedgerReason;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentProvider = 'stripe' | 'perfectpay' | 'dev';

export interface PaymentDTO {
  id: string;
  provider: PaymentProvider;
  planId: PlanId;
  credits: number;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

/** Public runtime configuration computed on the server from env vars. */
export interface StudioPublicConfig {
  aiProvider: 'fal' | 'mock';
  paymentProvider: PaymentProvider | 'none';
  signupBonus: number;
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_input'
  | 'email_taken'
  | 'invalid_credentials'
  | 'weak_password'
  | 'terms_required'
  | 'invalid_token'
  | 'rate_limited'
  | 'insufficient_credits'
  | 'prompt_blocked'
  | 'too_many_active'
  | 'not_found'
  | 'payments_unavailable'
  | 'provider_error'
  | 'timeout'
  | 'internal';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
}
