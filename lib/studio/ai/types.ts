// Server-only: the AI provider abstraction used by the generation service.
// A provider turns a prompt (+ optional reference image) into a queued job and reports its
// progress when polled. Implementations: fal.ai (real) and mock (demo results, no API key).
import type { AspectRatio, GenerationType } from '../plans';

export type ProviderName = 'fal' | 'mock';

export interface SubmitInput {
  generationId: string;
  type: GenerationType;
  prompt: string;
  aspectRatio: AspectRatio;
  /** An https URL (e.g. a previous result) or a data: URL of an uploaded image. */
  referenceImageUrl?: string;
}

export interface SubmitResult {
  /** Provider-side job id. */
  requestId: string;
  /** Model / endpoint that runs the job. */
  model: string;
  /** Provider-specific data needed to poll the job later (persisted as JSONB). */
  meta: Record<string, unknown>;
}

export type PollFailureCode = 'provider_error' | 'prompt_blocked';

/**
 * Result of one poll. `metaPatch` (optional) is shallow-merged into the stored provider meta,
 * which lets a provider keep small bits of state between polls (e.g. a retry counter).
 */
export type PollResult =
  | { state: 'queued'; queuePosition?: number; metaPatch?: Record<string, unknown> }
  | { state: 'processing'; metaPatch?: Record<string, unknown> }
  | { state: 'completed'; resultUrl: string }
  | { state: 'failed'; errorCode: PollFailureCode; message: string };

export interface PollInput {
  requestId: string;
  model: string;
  meta: Record<string, unknown>;
  type: GenerationType;
  createdAt: Date;
}

export interface AIProvider {
  name: ProviderName;
  /** Queues a job. Throws (preferably a ProviderError) when the provider rejects it. */
  submit(input: SubmitInput): Promise<SubmitResult>;
  /**
   * Checks a job. Throws on transient problems (network errors, 5xx) — the caller keeps the
   * generation pending and tries again later. Definitive failures are returned as state 'failed'.
   */
  poll(g: PollInput): Promise<PollResult>;
  /** Best-effort cancellation of a job we no longer need (never throws). */
  cancel?(g: PollInput): Promise<void>;
}

/** An error raised by a provider, carrying the machine-readable failure code to store. */
export class ProviderError extends Error {
  code: PollFailureCode;
  /** HTTP status returned by the provider, when there was one. */
  status?: number;
  /** Model the request was aimed at (for diagnostics). */
  model?: string;

  constructor(message: string, opts: { code?: PollFailureCode; status?: number; model?: string } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = opts.code ?? 'provider_error';
    this.status = opts.status;
    this.model = opts.model;
  }
}
