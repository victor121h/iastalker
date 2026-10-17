// Server-only: fal.ai provider, using the queue REST API with plain fetch (no SDK).
//
//   submit  POST https://queue.fal.run/<model_id>          → { request_id, status_url, response_url, cancel_url }
//   status  GET  <status_url>                               → { status: IN_QUEUE | IN_PROGRESS | COMPLETED, ... }
//   result  GET  <response_url>                             → model output JSON (non-2xx = failure, body.detail)
//   cancel  PUT  <cancel_url>
//
// The URLs returned on submit are stored in the generation's provider_meta and always used for
// later calls: for nested model ids (e.g. fal-ai/kling-video/v2.5-turbo/pro/text-to-video) the
// status URL is NOT simply "<model_id>/requests/<id>".
import { studioEnv } from '../env';
import type { AspectRatio } from '../plans';
import {
  ProviderError,
  type AIProvider,
  type PollFailureCode,
  type PollInput,
  type PollResult,
  type SubmitInput,
  type SubmitResult,
} from './types';

const QUEUE_BASE = 'https://queue.fal.run';
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;
const CANCEL_TIMEOUT_MS = 10_000;
/** Consecutive transient failures fetching a COMPLETED job's result before we give up. */
const MAX_RESULT_ERRORS = 5;
/** Consecutive 4xx answers from the status endpoint before we give up (401/404/…). */
const MAX_STATUS_CLIENT_ERRORS = 5;

const KLING_NEGATIVE_PROMPT = 'blur, distort, and low quality';

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

function requireKey(model?: string): string {
  const key = studioEnv.falKey();
  if (!key) throw new ProviderError('fal.ai API key (FAL_KEY) is not configured', { model });
  return key;
}

function authHeaders(key: string, json = false): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Key ${key}`, Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

/** Only ever send our API key to fal-owned https hosts. */
function trustedFalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const ok = host === 'fal.run' || host.endsWith('.fal.run') || host === 'fal.ai' || host.endsWith('.fal.ai');
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" → "fal-ai/kling-video" (the queue app id). */
function appIdOf(modelId: string): string {
  return modelId.split('/').filter(Boolean).slice(0, 2).join('/');
}

function fallbackUrls(modelId: string, requestId: string) {
  const base = `${QUEUE_BASE}/${appIdOf(modelId)}/requests/${encodeURIComponent(requestId)}`;
  return { statusUrl: `${base}/status`, responseUrl: base, cancelUrl: `${base}/cancel` };
}

interface FalResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

/** fetch with a hard timeout covering both the request and reading the body. */
async function falFetch(url: string, init: RequestInit, timeoutMs: number): Promise<FalResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.name === 'AbortError' ? 'request timed out' : err.message;
  return String(err);
}

const CONTENT_POLICY_RE =
  /content[ _-]?policy|nsfw|not safe for work|flagged|inappropriate|sensitive content|safety (?:system|filter|check(?:er)? (?:triggered|failed))/i;

/** Extracts a readable message from a fal error body ({detail: string | [{msg,type}]} etc.). */
function falErrorInfo(body: unknown, fallback: string): { message: string; code: PollFailureCode } {
  let message = '';
  let contentPolicy = false;
  if (typeof body === 'string') {
    message = body;
  } else if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const detail = b.detail;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      const parts: string[] = [];
      for (const item of detail) {
        if (item && typeof item === 'object') {
          const d = item as Record<string, unknown>;
          if (typeof d.type === 'string' && d.type.toLowerCase().includes('content_policy')) contentPolicy = true;
          if (typeof d.msg === 'string') {
            const loc = Array.isArray(d.loc) ? d.loc.filter((x) => typeof x === 'string' && x !== 'body').join('.') : '';
            parts.push(loc ? `${loc}: ${d.msg}` : d.msg);
          }
        } else if (typeof item === 'string') {
          parts.push(item);
        }
      }
      message = parts.join('; ');
    }
    if (!message && typeof b.error === 'string') message = b.error;
    if (!message && typeof b.message === 'string') message = b.message;
    if (typeof b.error_type === 'string' && b.error_type.toLowerCase().includes('content_policy')) contentPolicy = true;
  }
  message = message.replace(/\s+/g, ' ').trim().slice(0, 400) || fallback;
  if (CONTENT_POLICY_RE.test(message)) contentPolicy = true;
  return { message, code: contentPolicy ? 'prompt_blocked' : 'provider_error' };
}

function counter(meta: Record<string, unknown>, key: string): number {
  const v = meta[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// ── Model selection & input mapping ─────────────────────────────────────────────────────────

type Family = 'flux-kontext' | 'flux' | 'kling-i2v' | 'kling-t2v' | 'generic';

/** Detects the model family by substring so env overrides within the same family keep working. */
function modelFamily(modelId: string): Family {
  const m = modelId.toLowerCase();
  if (m.includes('kontext')) return 'flux-kontext';
  if (m.includes('kling')) return m.includes('image-to-video') ? 'kling-i2v' : 'kling-t2v';
  if (m.includes('flux')) return 'flux';
  return 'generic';
}

const FLUX_IMAGE_SIZE: Record<AspectRatio, string> = {
  '1:1': 'square_hd',
  '9:16': 'portrait_16_9',
  '16:9': 'landscape_16_9',
};

export function pickFalModel(input: Pick<SubmitInput, 'type' | 'referenceImageUrl'>): string {
  const models = studioEnv.falModels();
  if (input.type === 'video') return input.referenceImageUrl ? models.videoWithReference : models.video;
  return input.referenceImageUrl ? models.imageWithReference : models.image;
}

export function buildFalInput(modelId: string, input: SubmitInput): Record<string, unknown> {
  const { prompt, aspectRatio, referenceImageUrl } = input;
  switch (modelFamily(modelId)) {
    case 'flux':
      return {
        prompt,
        image_size: FLUX_IMAGE_SIZE[aspectRatio] || 'square_hd',
        num_images: 1,
        enable_safety_checker: true,
      };
    case 'flux-kontext':
      return {
        prompt,
        ...(referenceImageUrl ? { image_url: referenceImageUrl } : {}),
        aspect_ratio: aspectRatio,
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: '2',
      };
    case 'kling-t2v':
      return {
        prompt,
        duration: '5',
        aspect_ratio: aspectRatio,
        negative_prompt: KLING_NEGATIVE_PROMPT,
        cfg_scale: 0.5,
      };
    case 'kling-i2v':
      return {
        prompt,
        ...(referenceImageUrl ? { image_url: referenceImageUrl } : {}),
        duration: '5',
        negative_prompt: KLING_NEGATIVE_PROMPT,
        cfg_scale: 0.5,
      };
    default:
      return {
        prompt,
        ...(referenceImageUrl ? { image_url: referenceImageUrl } : {}),
        aspect_ratio: aspectRatio,
      };
  }
}

// ── Output extraction ───────────────────────────────────────────────────────────────────────

function urlOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
  }
  return null;
}

/** Generic output parsing: images[0].url | image.url | video.url | output (string). */
export function extractFalResultUrl(output: unknown): string | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  const candidates: unknown[] = [
    Array.isArray(o.images) ? o.images[0] : undefined,
    o.image,
    o.video,
    Array.isArray(o.videos) ? o.videos[0] : undefined,
    o.output,
  ];
  for (const candidate of candidates) {
    const url = urlOf(candidate);
    if (url && isHttpsUrl(url)) return url;
  }
  return null;
}

/** True when the provider's own safety checker flagged the output. */
export function falOutputFlagged(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false;
  const flags = (output as Record<string, unknown>).has_nsfw_concepts;
  if (flags === true) return true;
  return Array.isArray(flags) && flags.some((f) => f === true);
}

// ── Provider ────────────────────────────────────────────────────────────────────────────────

function pollUrls(g: PollInput) {
  const meta = g.meta || {};
  const endpoint = typeof meta.endpoint === 'string' && meta.endpoint ? meta.endpoint : g.model;
  const fallback = fallbackUrls(endpoint, g.requestId);
  return {
    statusUrl: trustedFalUrl(meta.statusUrl) || fallback.statusUrl,
    responseUrl: trustedFalUrl(meta.responseUrl) || fallback.responseUrl,
    cancelUrl: trustedFalUrl(meta.cancelUrl) || fallback.cancelUrl,
  };
}

async function fetchResult(key: string, g: PollInput, responseUrl: string): Promise<PollResult> {
  const meta = g.meta || {};
  const errors = counter(meta, 'resultErrors');
  const transient = (why: string): PollResult => {
    if (errors + 1 >= MAX_RESULT_ERRORS) {
      return { state: 'failed', errorCode: 'provider_error', message: `Could not fetch the result: ${why}` };
    }
    console.warn(`[studio] fal result fetch failed (${errors + 1}/${MAX_RESULT_ERRORS}) for ${g.requestId}: ${why}`);
    return { state: 'processing', metaPatch: { resultErrors: errors + 1 } };
  };

  let res: FalResponse;
  try {
    res = await falFetch(responseUrl, { method: 'GET', headers: authHeaders(key) }, POLL_TIMEOUT_MS);
  } catch (err) {
    return transient(describeError(err));
  }
  if (!res.ok) {
    if (res.status >= 500 || res.status === 429 || res.status === 408) return transient(`HTTP ${res.status}`);
    const info = falErrorInfo(res.body, `fal.ai returned HTTP ${res.status}`);
    return { state: 'failed', errorCode: info.code, message: info.message };
  }
  if (falOutputFlagged(res.body)) {
    return { state: 'failed', errorCode: 'prompt_blocked', message: 'The output was flagged by the safety checker' };
  }
  const url = extractFalResultUrl(res.body);
  if (!url) return { state: 'failed', errorCode: 'provider_error', message: 'The provider returned no usable output' };
  return { state: 'completed', resultUrl: url };
}

export const falProvider: AIProvider = {
  name: 'fal',

  async submit(input: SubmitInput): Promise<SubmitResult> {
    const model = pickFalModel(input);
    const key = requireKey(model);
    const body = buildFalInput(model, input);

    let res: FalResponse;
    try {
      res = await falFetch(
        `${QUEUE_BASE}/${model}`,
        { method: 'POST', headers: authHeaders(key, true), body: JSON.stringify(body) },
        SUBMIT_TIMEOUT_MS,
      );
    } catch (err) {
      throw new ProviderError(`fal.ai submit failed: ${describeError(err)}`, { model });
    }
    if (!res.ok) {
      const info = falErrorInfo(res.body, 'request rejected');
      throw new ProviderError(`fal.ai submit failed (HTTP ${res.status}): ${info.message}`, {
        code: info.code,
        status: res.status,
        model,
      });
    }

    const data = (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;
    const requestId = typeof data.request_id === 'string' ? data.request_id : '';
    if (!requestId) throw new ProviderError('fal.ai submit returned no request_id', { model, status: res.status });

    const fallback = fallbackUrls(model, requestId);
    return {
      requestId,
      model,
      meta: {
        endpoint: model,
        statusUrl: trustedFalUrl(data.status_url) || fallback.statusUrl,
        responseUrl: trustedFalUrl(data.response_url) || fallback.responseUrl,
        cancelUrl: trustedFalUrl(data.cancel_url) || fallback.cancelUrl,
      },
    };
  },

  async poll(g: PollInput): Promise<PollResult> {
    const key = requireKey(g.model);
    const meta = g.meta || {};
    const { statusUrl, responseUrl } = pollUrls(g);

    // Network errors / timeouts propagate: the caller treats them as transient.
    const res = await falFetch(statusUrl, { method: 'GET', headers: authHeaders(key) }, POLL_TIMEOUT_MS);
    if (!res.ok) {
      if (res.status >= 500 || res.status === 429 || res.status === 408) {
        throw new ProviderError(`fal.ai status check failed (HTTP ${res.status})`, { status: res.status });
      }
      // 4xx (bad key, unknown request…): give it a few tries, then fail for good.
      const errors = counter(meta, 'statusErrors') + 1;
      const info = falErrorInfo(res.body, `HTTP ${res.status}`);
      if (errors >= MAX_STATUS_CLIENT_ERRORS) {
        return { state: 'failed', errorCode: 'provider_error', message: `Status check failed: ${info.message}` };
      }
      console.warn(`[studio] fal status check HTTP ${res.status} (${errors}/${MAX_STATUS_CLIENT_ERRORS}) for ${g.requestId}`);
      return { state: 'processing', metaPatch: { statusErrors: errors } };
    }

    const reset = counter(meta, 'statusErrors') > 0 ? { statusErrors: 0 } : undefined;
    const data = (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;
    const status = typeof data.status === 'string' ? data.status.toUpperCase() : '';

    if (status === 'IN_QUEUE') {
      const pos = data.queue_position;
      return {
        state: 'queued',
        queuePosition: typeof pos === 'number' && Number.isFinite(pos) && pos >= 0 ? Math.floor(pos) : undefined,
        metaPatch: reset,
      };
    }
    if (status === 'COMPLETED') {
      // A COMPLETED status may carry an error: the job ran and failed.
      if (data.error !== undefined && data.error !== null && data.error !== '') {
        const info = falErrorInfo(
          { error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error), error_type: data.error_type },
          'The generation failed',
        );
        return { state: 'failed', errorCode: info.code, message: info.message };
      }
      return fetchResult(key, g, responseUrl);
    }
    // IN_PROGRESS or any status we do not know yet.
    return { state: 'processing', metaPatch: reset };
  },

  async cancel(g: PollInput): Promise<void> {
    const key = studioEnv.falKey();
    if (!key) return;
    try {
      const { cancelUrl } = pollUrls(g);
      await falFetch(cancelUrl, { method: 'PUT', headers: authHeaders(key) }, CANCEL_TIMEOUT_MS);
    } catch (err) {
      console.warn(`[studio] fal cancel failed for ${g.requestId}: ${describeError(err)}`);
    }
  },
};
