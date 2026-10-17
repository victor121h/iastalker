// Server-only generation service: creates generations (debit → submit → refund on failure),
// advances them with the AI provider when polled, and manages conversations.
//
// Credit invariants:
//   - credits are debited in the same transaction that inserts the generation (never negative:
//     debitCredits refuses when the balance is too low)
//   - every failure path goes through failGeneration(), which flips the row to 'failed' and calls
//     refundGeneration() in ONE transaction; the refund is guarded by the `refunded` flag, so it
//     happens exactly once no matter how many requests race on the same row.
import crypto from 'crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { query, tx } from './db';
import { HttpError } from './http';
import { debitCredits, refundGeneration } from './credits';
import { studioEnv } from './env';
import { ASPECT_RATIOS, GENERATION_COST, MAX_REFERENCE_BYTES, type AspectRatio, type GenerationType } from './plans';
import type { ConversationDTO, GenerationDTO, GenerationStatus } from './types';
import { getActiveProvider, getProvider, ProviderError, type PollInput, type PollResult, type SubmitResult } from './ai';

// ── Tunables ─────────────────────────────────────────────────────────────────────────────────

/** A generation still pending after this long is failed with 'timeout' and refunded. */
const TIMEOUT_MS: Record<GenerationType, number> = {
  image: 15 * 60 * 1000,
  video: 30 * 60 * 1000,
};
/** A 'queued' row that never got a provider request id (server died mid-submit) is failed after this. */
const SUBMIT_STALE_MS = 2 * 60 * 1000;
/** Minimum delay between two provider polls of the same generation (shared by all requests). */
const POLL_INTERVAL_SQL = "INTERVAL '2 seconds'";
/** An identical request within this window while the first is still pending is treated as a double submit. */
const DUPLICATE_WINDOW_SQL = "INTERVAL '5 seconds'";
const ERROR_MAX_LENGTH = 500;
const TITLE_MAX_CHARS = 60;
export const CONVERSATION_TITLE_MAX = 80;
const CONVERSATIONS_LIMIT = 100;
const CONVERSATION_GENERATIONS_LIMIT = 300;

const PENDING_SQL = "('queued', 'processing')";

/** Messages exposed to the client (the raw provider error stays in the database). */
const PUBLIC_ERRORS: Record<string, string> = {
  provider_error: 'The AI engine could not generate this.',
  prompt_blocked: 'This request was blocked by the content filter.',
  timeout: 'The generation took too long and was cancelled.',
};

// ── Rows & DTOs ──────────────────────────────────────────────────────────────────────────────

export interface GenerationRow {
  id: string;
  user_id: string;
  conversation_id: string;
  type: string;
  prompt: string;
  aspect_ratio: string;
  cost: number;
  status: GenerationStatus;
  reference_upload_id: string | null;
  reference_url: string | null;
  provider: string;
  model: string | null;
  provider_request_id: string | null;
  provider_meta: Record<string, unknown> | null;
  queue_position: number | null;
  result_url: string | null;
  error_code: string | null;
  error: string | null;
  refunded: boolean;
  last_polled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  generation_count?: number | string | null;
  preview_url?: string | null;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && (ASPECT_RATIOS as string[]).includes(value);
}

export function isPendingStatus(status: string): boolean {
  return status === 'queued' || status === 'processing';
}

export function uploadUrl(uploadId: string): string {
  return `/api/studio/uploads/${uploadId}`;
}

export function rowToDTO(row: GenerationRow): GenerationDTO {
  const failed = row.status === 'failed';
  return {
    id: row.id,
    conversationId: row.conversation_id,
    type: row.type === 'video' ? 'video' : 'image',
    prompt: row.prompt,
    aspectRatio: isAspectRatio(row.aspect_ratio) ? row.aspect_ratio : '1:1',
    cost: Number(row.cost),
    status: row.status,
    resultUrl: row.status === 'completed' ? row.result_url : null,
    referenceUrl: row.reference_upload_id ? uploadUrl(row.reference_upload_id) : row.reference_url,
    errorCode: failed ? row.error_code || 'provider_error' : null,
    error: failed ? PUBLIC_ERRORS[row.error_code || ''] || 'The generation failed.' : null,
    refunded: Boolean(row.refunded),
    queuePosition: isPendingStatus(row.status) && row.queue_position !== null ? Number(row.queue_position) : null,
    createdAt: iso(row.created_at) || new Date().toISOString(),
    completedAt: iso(row.completed_at),
  };
}

export function conversationToDTO(row: ConversationRow): ConversationDTO {
  return {
    id: row.id,
    title: row.title,
    createdAt: iso(row.created_at) || new Date().toISOString(),
    updatedAt: iso(row.updated_at) || new Date().toISOString(),
    generationCount: Number(row.generation_count || 0),
    previewUrl: row.preview_url || null,
  };
}

// ── Small helpers ────────────────────────────────────────────────────────────────────────────

type Db = Pick<PoolClient, 'query'>;

function run<R extends QueryResultRow>(db: Db | undefined, text: string, params: unknown[]) {
  return db ? db.query<R>(text, params) : query<R>(text, params);
}

function truncate(text: string, max = ERROR_MAX_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Removes characters Postgres TEXT cannot store (NUL) and other invisible control characters. */
export function sanitizeText(value: string, opts: { singleLine?: boolean } = {}): string {
  let out = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (opts.singleLine) out = out.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
  return out.trim();
}

/** Conversation title from the first prompt: ~60 characters, cut on a word boundary. */
export function titleFromPrompt(prompt: string): string {
  const chars = Array.from(sanitizeText(prompt, { singleLine: true }));
  if (chars.length <= TITLE_MAX_CHARS) return chars.join('');
  const cut = chars.slice(0, TITLE_MAX_CHARS).join('');
  const space = cut.lastIndexOf(' ');
  const base = space >= 40 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s.,;:!?\-–—]+$/, '')}…`;
}

function isHttpsUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function toPollInput(row: GenerationRow): PollInput {
  return {
    requestId: row.provider_request_id || row.id,
    model: row.model || '',
    meta: row.provider_meta && typeof row.provider_meta === 'object' ? row.provider_meta : {},
    type: row.type === 'video' ? 'video' : 'image',
    createdAt: new Date(row.created_at),
  };
}

function cancelAtProvider(row: GenerationRow) {
  if (!row.provider_request_id) return;
  const provider = getProvider(row.provider);
  if (!provider?.cancel) return;
  provider.cancel(toPollInput(row)).catch(() => {});
}

// ── Reference images ─────────────────────────────────────────────────────────────────────────

export type ReferenceMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ReferenceImage {
  mime: ReferenceMime;
  data: Buffer;
}

const DATA_URL_PREFIX_RE = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Detects the real image type from its magic bytes. */
export function sniffImageMime(b: Buffer): ReferenceMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Parses and validates a `data:image/(jpeg|png|webp);base64,...` reference image. */
export function parseReferenceDataUrl(value: unknown): ReferenceImage {
  const invalid = (message: string, status = 400) =>
    new HttpError(status, 'invalid_input', message, { field: 'referenceImage', maxBytes: MAX_REFERENCE_BYTES });
  if (typeof value !== 'string') throw invalid('referenceImage must be a data URL');
  const prefix = DATA_URL_PREFIX_RE.exec(value.slice(0, 40));
  if (!prefix) throw invalid('Reference image must be a JPEG, PNG or WebP data URL');

  let b64 = value.slice(prefix[0].length);
  if (/\s/.test(b64)) b64 = b64.replace(/\s+/g, '');
  if (!b64 || b64.length % 4 === 1 || !BASE64_RE.test(b64)) throw invalid('Reference image is not valid base64');
  if (Math.floor((b64.length * 3) / 4) > MAX_REFERENCE_BYTES + 2) throw invalid('Reference image is too large', 413);

  const data = Buffer.from(b64, 'base64');
  if (data.length > MAX_REFERENCE_BYTES) throw invalid('Reference image is too large', 413);
  if (data.length < 32) throw invalid('Reference image is empty');
  const mime = sniffImageMime(data);
  if (!mime) throw invalid('Reference image must be a JPEG, PNG or WebP file');
  return { mime, data };
}

// ── Reads ────────────────────────────────────────────────────────────────────────────────────

const CONVERSATION_SELECT = `
  SELECT c.id, c.user_id, c.title, c.created_at, c.updated_at,
         (SELECT COUNT(*)::int FROM studio_generations g WHERE g.conversation_id = c.id) AS generation_count,
         (SELECT g.result_url FROM studio_generations g
           WHERE g.conversation_id = c.id AND g.type = 'image' AND g.status = 'completed' AND g.result_url IS NOT NULL
           ORDER BY g.created_at DESC
           LIMIT 1) AS preview_url
    FROM studio_conversations c`;

export async function getBalance(userId: string, db?: Db): Promise<number> {
  const { rows } = await run<{ credits: number }>(db, 'SELECT credits FROM studio_users WHERE id = $1', [userId]);
  return Number(rows[0]?.credits ?? 0);
}

export async function getGenerationRow(id: string, db?: Db): Promise<GenerationRow | null> {
  const { rows } = await run<GenerationRow>(db, 'SELECT * FROM studio_generations WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getUserGeneration(userId: string, id: string): Promise<GenerationRow | null> {
  if (!id || id.length > 64) return null;
  const { rows } = await query<GenerationRow>('SELECT * FROM studio_generations WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
  return rows[0] ?? null;
}

export async function getConversation(userId: string, id: string, db?: Db): Promise<ConversationDTO | null> {
  if (!id || id.length > 64) return null;
  const { rows } = await run<ConversationRow>(db, `${CONVERSATION_SELECT} WHERE c.id = $1 AND c.user_id = $2`, [
    id,
    userId,
  ]);
  return rows[0] ? conversationToDTO(rows[0]) : null;
}

export async function listConversations(userId: string): Promise<ConversationDTO[]> {
  const { rows } = await query<ConversationRow>(
    `${CONVERSATION_SELECT} WHERE c.user_id = $1 ORDER BY c.updated_at DESC, c.id LIMIT ${CONVERSATIONS_LIMIT}`,
    [userId],
  );
  return rows.map(conversationToDTO);
}

/** The most recent 300 generations of a conversation, oldest first. */
export async function listConversationGenerations(conversationId: string): Promise<GenerationDTO[]> {
  const { rows } = await query<GenerationRow>(
    `SELECT * FROM (
       SELECT * FROM studio_generations WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT ${CONVERSATION_GENERATIONS_LIMIT}
     ) recent
     ORDER BY created_at ASC, id ASC`,
    [conversationId],
  );
  return rows.map(rowToDTO);
}

// ── Conversation mutations ───────────────────────────────────────────────────────────────────

export async function renameConversation(userId: string, id: string, title: string): Promise<ConversationDTO | null> {
  if (!id || id.length > 64) return null;
  const { rows } = await query<{ id: string }>(
    'UPDATE studio_conversations SET title = $3 WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId, title],
  );
  if (!rows[0]) return null;
  return getConversation(userId, id);
}

/**
 * Deletes a conversation with its generations. Generations still in progress are cancelled at the
 * provider and refunded (the user will never see their result). Uploads that were only used as
 * references in this conversation are deleted too. Returns false when it does not exist.
 */
export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  if (!id || id.length > 64) return false;
  const cancelled = await tx(async (c) => {
    // Lock the conversation first so a concurrent /generate into it either commits before us
    // (and its pending generation is refunded below) or sees the conversation gone.
    const conv = await c.query('SELECT id FROM studio_conversations WHERE id = $1 AND user_id = $2 FOR UPDATE', [
      id,
      userId,
    ]);
    if (!conv.rows[0]) return null;

    const pending = await c.query<GenerationRow>(
      `UPDATE studio_generations
          SET status = 'failed', error_code = 'provider_error', error = 'Conversation deleted while in progress',
              queue_position = NULL, completed_at = NOW(), updated_at = NOW()
        WHERE conversation_id = $1 AND status IN ${PENDING_SQL}
        RETURNING *`,
      [id],
    );
    for (const row of pending.rows) await refundGeneration(c, row.id);

    const uploads = await c.query<{ reference_upload_id: string }>(
      `SELECT DISTINCT reference_upload_id FROM studio_generations
        WHERE conversation_id = $1 AND reference_upload_id IS NOT NULL`,
      [id],
    );
    await c.query('DELETE FROM studio_conversations WHERE id = $1 AND user_id = $2', [id, userId]);

    const uploadIds = uploads.rows.map((r) => r.reference_upload_id);
    if (uploadIds.length > 0) {
      await c.query(
        `DELETE FROM studio_uploads u
          WHERE u.id = ANY($1::text[]) AND u.user_id = $2
            AND NOT EXISTS (SELECT 1 FROM studio_generations g WHERE g.reference_upload_id = u.id)`,
        [uploadIds, userId],
      );
    }
    return pending.rows;
  });
  if (cancelled === null) return false;
  cancelled.forEach(cancelAtProvider);
  return true;
}

// ── State transitions ────────────────────────────────────────────────────────────────────────

/**
 * Marks a pending generation as failed and refunds it, atomically. Also heals a row that is
 * already 'failed' but was never refunded. Returns the fresh row (null if it no longer exists).
 */
export async function failGeneration(
  id: string,
  errorCode: string,
  message: string,
  opts: { model?: string } = {},
): Promise<GenerationRow | null> {
  return tx(async (c) => {
    await c.query(
      `UPDATE studio_generations
          SET status = 'failed', error_code = $2, error = $3, queue_position = NULL,
              model = COALESCE(model, $4), completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status IN ${PENDING_SQL}`,
      [id, errorCode, truncate(message), opts.model ?? null],
    );
    await refundGeneration(c, id); // no-op unless status = 'failed' AND refunded = FALSE
    return getGenerationRow(id, c);
  });
}

async function completeGeneration(id: string, resultUrl: string): Promise<GenerationRow | null> {
  const { rows } = await query<GenerationRow>(
    `UPDATE studio_generations
        SET status = 'completed', result_url = $2, queue_position = NULL, error_code = NULL, error = NULL,
            completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status IN ${PENDING_SQL}
      RETURNING *`,
    [id, resultUrl],
  );
  return rows[0] ?? getGenerationRow(id);
}

async function updateProgress(
  row: GenerationRow,
  result: Extract<PollResult, { state: 'queued' | 'processing' }>,
): Promise<GenerationRow | null> {
  const status: GenerationStatus = result.state === 'queued' ? 'queued' : 'processing';
  const queuePosition = result.state === 'queued' && result.queuePosition !== undefined ? result.queuePosition : null;
  const patch = result.metaPatch && Object.keys(result.metaPatch).length > 0 ? result.metaPatch : null;
  if (!patch && row.status === status && row.queue_position === queuePosition) return row;

  const { rows } = await query<GenerationRow>(
    `UPDATE studio_generations
        SET status = $2, queue_position = $3,
            provider_meta = COALESCE(provider_meta, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
      WHERE id = $1 AND status IN ${PENDING_SQL}
      RETURNING *`,
    [row.id, status, queuePosition, JSON.stringify(patch || {})],
  );
  return rows[0] ?? getGenerationRow(row.id);
}

/**
 * Atomically reserves the right to poll the provider for this generation. Returns the row when
 * this request won the slot, or null when another request polled it less than 2 seconds ago.
 */
async function claimPollSlot(id: string): Promise<GenerationRow | null> {
  const { rows } = await query<GenerationRow>(
    `UPDATE studio_generations SET last_polled_at = NOW()
      WHERE id = $1 AND status IN ${PENDING_SQL}
        AND (last_polled_at IS NULL OR last_polled_at < NOW() - ${POLL_INTERVAL_SQL})
      RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Moves a generation forward: polls the provider (at most once every 2 s across all requests),
 * stores progress / the result, and fails + refunds it on provider errors or timeouts.
 * Returns the up-to-date row, or null if it was deleted meanwhile (conversation deleted).
 */
export async function advanceGeneration(row: GenerationRow): Promise<GenerationRow | null> {
  if (!isPendingStatus(row.status)) {
    if (row.status === 'failed' && !row.refunded) return failGeneration(row.id, row.error_code || 'provider_error', row.error || '');
    return row;
  }

  const type: GenerationType = row.type === 'video' ? 'video' : 'image';
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  const timedOut = ageMs > TIMEOUT_MS[type];

  const provider = getProvider(row.provider);
  if (!provider) return failGeneration(row.id, 'provider_error', `Unknown provider "${row.provider}"`);

  if (!row.provider_request_id) {
    // The submit call is still in flight — or the server died before recording it.
    if (ageMs > SUBMIT_STALE_MS) return failGeneration(row.id, 'provider_error', 'The submission never completed');
    return row;
  }

  const claimed = await claimPollSlot(row.id);
  if (!claimed) return getGenerationRow(row.id); // polled very recently by another request

  const input = toPollInput(claimed);
  let result: PollResult | null = null;
  try {
    result = await provider.poll(input);
  } catch (err) {
    // Transient (network, 5xx…): keep the generation pending and try again on the next poll.
    console.warn(`[studio] poll failed for generation ${row.id}:`, err instanceof Error ? err.message : err);
  }

  if (result?.state === 'completed') return completeGeneration(row.id, result.resultUrl);
  if (result?.state === 'failed') return failGeneration(row.id, result.errorCode, result.message);

  if (timedOut) {
    if (provider.cancel) provider.cancel(input).catch(() => {});
    const minutes = Math.round(TIMEOUT_MS[type] / 60000);
    return failGeneration(row.id, 'timeout', `No result after ${minutes} minutes`);
  }
  if (!result) return claimed;
  return updateProgress(claimed, result);
}

// ── Creation ─────────────────────────────────────────────────────────────────────────────────

export interface CreateGenerationInput {
  userId: string;
  /** Existing conversation (must belong to the user) or null to start a new one. */
  conversationId: string | null;
  type: GenerationType;
  prompt: string;
  aspectRatio: AspectRatio;
  /** Validated uploaded reference image. */
  reference: ReferenceImage | null;
  /** The user's own completed image generation used as reference (validated by the caller). */
  referenceGeneration: GenerationRow | null;
}

export interface CreateGenerationResult {
  generation: GenerationRow;
  conversation: ConversationDTO;
  balance: number;
}

/**
 * Debits the credits and records the generation in one transaction, then submits it to the
 * provider outside of the transaction. A rejected submission is failed + refunded immediately;
 * the (failed, refunded) generation is still returned so the chat can show what happened.
 */
export async function createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResult> {
  const { userId, type, prompt, aspectRatio, reference, referenceGeneration } = input;
  const provider = getActiveProvider();
  const cost = GENERATION_COST[type];
  const generationId = crypto.randomUUID();
  const referenceSourceUrl = referenceGeneration?.result_url || null;

  if (referenceGeneration && provider.name === 'fal' && !isHttpsUrl(referenceSourceUrl)) {
    // e.g. a demo (mock) result: the real provider could not download it.
    throw new HttpError(400, 'invalid_input', 'This image cannot be used as a reference', {
      field: 'referenceGenerationId',
    });
  }

  const created = await tx(async (c) => {
    // Serialise this user's generate requests: the active-count check, the duplicate check and
    // the debit below all see a consistent state.
    const user = await c.query<{ credits: number }>('SELECT credits FROM studio_users WHERE id = $1 FOR UPDATE', [userId]);
    if (!user.rows[0]) throw new HttpError(401, 'unauthorized', 'Please log in to continue');

    let conversationId = input.conversationId;
    if (conversationId) {
      const conv = await c.query('SELECT id FROM studio_conversations WHERE id = $1 AND user_id = $2 FOR UPDATE', [
        conversationId,
        userId,
      ]);
      if (!conv.rows[0]) throw new HttpError(404, 'not_found', 'Conversation not found');
    }

    // Double submit (double click, retried request): same request still pending a moment ago.
    const dup = await c.query<GenerationRow>(
      `SELECT * FROM studio_generations
        WHERE user_id = $1 AND type = $2 AND prompt = $3 AND aspect_ratio = $4
          AND status IN ${PENDING_SQL} AND created_at > NOW() - ${DUPLICATE_WINDOW_SQL}
          AND ($5::text IS NULL OR conversation_id = $5)
          AND (reference_upload_id IS NOT NULL) = $6
          AND reference_url IS NOT DISTINCT FROM $7
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId, type, prompt, aspectRatio, conversationId, reference !== null, referenceSourceUrl],
    );
    if (dup.rows[0]) return { row: dup.rows[0], duplicate: true };

    const active = await c.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM studio_generations WHERE user_id = $1 AND status IN ${PENDING_SQL}`,
      [userId],
    );
    const maxActive = studioEnv.maxActiveGenerations();
    if (Number(active.rows[0]?.n ?? 0) >= maxActive) {
      throw new HttpError(429, 'too_many_active', 'Too many generations in progress', { max: maxActive });
    }

    if (!conversationId) {
      conversationId = crypto.randomUUID();
      await c.query('INSERT INTO studio_conversations (id, user_id, title) VALUES ($1, $2, $3)', [
        conversationId,
        userId,
        titleFromPrompt(prompt),
      ]);
    }

    const balance = await debitCredits(c, userId, cost, 'generation', { type: 'generation', id: generationId });
    if (balance === null) {
      throw new HttpError(402, 'insufficient_credits', 'Not enough credits', {
        required: cost,
        balance: Number(user.rows[0].credits),
      });
    }

    let uploadId: string | null = null;
    if (reference) {
      uploadId = crypto.randomUUID();
      await c.query('INSERT INTO studio_uploads (id, user_id, mime, size, data) VALUES ($1, $2, $3, $4, $5)', [
        uploadId,
        userId,
        reference.mime,
        reference.data.length,
        reference.data,
      ]);
    }

    const inserted = await c.query<GenerationRow>(
      `INSERT INTO studio_generations
         (id, user_id, conversation_id, type, prompt, aspect_ratio, cost, status,
          reference_upload_id, reference_url, provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', $8, $9, $10)
       RETURNING *`,
      [generationId, userId, conversationId, type, prompt, aspectRatio, cost, uploadId, referenceSourceUrl, provider.name],
    );
    await c.query('UPDATE studio_conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    return { row: inserted.rows[0], duplicate: false };
  });

  let row: GenerationRow | null = created.row;

  if (!created.duplicate) {
    const referenceImageUrl = reference
      ? `data:${reference.mime};base64,${reference.data.toString('base64')}`
      : referenceSourceUrl || undefined;

    let submitted: SubmitResult | null = null;
    try {
      submitted = await provider.submit({ generationId, type, prompt, aspectRatio, referenceImageUrl });
    } catch (err) {
      const code = err instanceof ProviderError ? err.code : 'provider_error';
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[studio] submit failed for generation ${generationId}: ${truncate(message, 300)}`);
      row = await failGeneration(generationId, code, message, {
        model: err instanceof ProviderError ? err.model : undefined,
      });
    }

    if (submitted) {
      const { rows } = await query<GenerationRow>(
        `UPDATE studio_generations
            SET status = 'processing', provider_request_id = $2, model = $3, provider_meta = $4::jsonb,
                queue_position = NULL, updated_at = NOW()
          WHERE id = $1 AND status = 'queued' AND provider_request_id IS NULL
          RETURNING *`,
        [generationId, submitted.requestId, submitted.model, JSON.stringify(submitted.meta || {})],
      );
      if (rows[0]) {
        row = rows[0];
      } else {
        // Deleted (conversation removed) or failed meanwhile: nobody will poll this job.
        if (provider.cancel) {
          provider
            .cancel({ requestId: submitted.requestId, model: submitted.model, meta: submitted.meta, type, createdAt: new Date() })
            .catch(() => {});
        }
        row = await getGenerationRow(generationId);
      }
    }
  }

  if (!row) throw new HttpError(404, 'not_found', 'Conversation not found');
  const conversation = await getConversation(userId, row.conversation_id);
  if (!conversation) throw new HttpError(404, 'not_found', 'Conversation not found');
  const balance = await getBalance(userId);
  return { generation: row, conversation, balance };
}
