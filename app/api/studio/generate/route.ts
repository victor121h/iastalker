// POST /api/studio/generate — debits credits and queues an image/video generation.
//   body  { conversationId?, type, prompt, aspectRatio, referenceImage?, referenceGenerationId? }
//   200   { generation, conversation, balance }   (the generation may already be failed + refunded
//                                                  when the provider rejected the submission)
//   402 insufficient_credits {required, balance} · 422 prompt_blocked · 429 too_many_active / rate_limited
import type { NextRequest } from 'next/server';
import { requireUserRow } from '@/lib/studio/auth';
import { HttpError, enforceRateLimit, json, readJson, route } from '@/lib/studio/http';
import { ASPECT_RATIOS, MAX_PROMPT_LENGTH, type AspectRatio, type GenerationType } from '@/lib/studio/plans';
import { checkPrompt } from '@/lib/studio/moderation';
import {
  createGeneration,
  getUserGeneration,
  parseReferenceDataUrl,
  rowToDTO,
  sanitizeText,
  type GenerationRow,
  type ReferenceImage,
} from '@/lib/studio/generations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Base64 of a MAX_REFERENCE_BYTES image (~8 MiB) + the rest of the body. */
const MAX_BODY_BYTES = 9 * 1024 * 1024;
const GENERATE_LIMIT_PER_MINUTE = 12;

function invalid(message: string, field: string): HttpError {
  return new HttpError(400, 'invalid_input', message, { field });
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 64 || !/^[A-Za-z0-9-]+$/.test(value)) {
    throw invalid(`${field} is invalid`, field);
  }
  return value;
}

export const POST = route(async (req: NextRequest) => {
  const user = await requireUserRow();
  enforceRateLimit(`studio:generate:${user.id}`, GENERATE_LIMIT_PER_MINUTE, 60_000);

  const body = await readJson<Record<string, unknown>>(req, MAX_BODY_BYTES);

  // ── 1. Validation ─────────────────────────────────────────────────────────────────────────
  const type = body.type;
  if (type !== 'image' && type !== 'video') throw invalid('type must be "image" or "video"', 'type');

  if (typeof body.prompt !== 'string') throw invalid('prompt is required', 'prompt');
  const prompt = sanitizeText(body.prompt);
  if (prompt.length < 1) throw invalid('prompt is required', 'prompt');
  if (prompt.length > MAX_PROMPT_LENGTH) throw invalid('prompt is too long', 'prompt');

  let aspectRatio: AspectRatio = '1:1';
  if (body.aspectRatio !== undefined && body.aspectRatio !== null) {
    if (typeof body.aspectRatio !== 'string' || !(ASPECT_RATIOS as string[]).includes(body.aspectRatio)) {
      throw invalid(`aspectRatio must be one of ${ASPECT_RATIOS.join(', ')}`, 'aspectRatio');
    }
    aspectRatio = body.aspectRatio as AspectRatio;
  }

  const conversationId = optionalId(body.conversationId, 'conversationId');
  const referenceGenerationId = optionalId(body.referenceGenerationId, 'referenceGenerationId');
  const hasImage = body.referenceImage !== undefined && body.referenceImage !== null && body.referenceImage !== '';
  if (hasImage && referenceGenerationId) {
    throw invalid('Use either referenceImage or referenceGenerationId, not both', 'referenceImage');
  }

  const reference: ReferenceImage | null = hasImage ? parseReferenceDataUrl(body.referenceImage) : null;

  let referenceGeneration: GenerationRow | null = null;
  if (referenceGenerationId) {
    const source = await getUserGeneration(user.id, referenceGenerationId);
    if (!source || source.type !== 'image' || source.status !== 'completed' || !source.result_url) {
      throw new HttpError(404, 'not_found', 'Reference image not found', { field: 'referenceGenerationId' });
    }
    referenceGeneration = source;
  }

  // ── 2. Content policy ─────────────────────────────────────────────────────────────────────
  // A previous result counts as a "photo" reference when it was itself derived from an upload.
  const hasReference =
    reference !== null ||
    (referenceGeneration !== null && Boolean(referenceGeneration.reference_upload_id || referenceGeneration.reference_url));
  const moderation = checkPrompt(prompt, { hasReference });
  if (!moderation.ok) {
    console.warn(`[studio] prompt blocked for user ${user.id} (${moderation.reason})`);
    throw new HttpError(422, 'prompt_blocked', 'This prompt violates the content policy', {
      reason: moderation.reason,
    });
  }

  // ── 3 & 4. Debit + record (one transaction), then submit to the provider ─────────────────
  const result = await createGeneration({
    userId: user.id,
    conversationId,
    type: type as GenerationType,
    prompt,
    aspectRatio,
    reference,
    referenceGeneration,
  });

  return json({
    generation: rowToDTO(result.generation),
    conversation: result.conversation,
    balance: result.balance,
  });
});
