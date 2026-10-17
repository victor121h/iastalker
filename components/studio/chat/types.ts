// Client-side state shapes shared by the chat components.
import type { AspectRatio, GenerationType } from '@/lib/studio/plans';
import type { GenerationDTO, GenerationStatus } from '@/lib/studio/types';

export interface ChatItem {
  /** Stable React key — survives the optimistic → real swap and reloads of the conversation. */
  key: string;
  generation: GenerationDTO;
  /** The generate request is still in flight (temporary, client-made generation). */
  optimistic?: boolean;
  /** Created during this visit: plays the entrance animation. */
  fresh?: boolean;
}

/** Reference image currently attached to the composer. */
export type ComposerReference =
  | {
      kind: 'upload';
      /** data:image/jpeg;base64,… ready to send as `referenceImage`. */
      dataUrl: string;
      previewUrl: string;
      name: string;
      bytes: number;
    }
  | {
      kind: 'generation';
      /** One of the user's completed image generations (`referenceGenerationId`). */
      generationId: string;
      previewUrl: string;
    };

export interface GenerationRequest {
  type: GenerationType;
  prompt: string;
  aspectRatio: AspectRatio;
  reference: ComposerReference | null;
}

export interface PaywallState {
  open: boolean;
  /** Credits the user is short of for the action they tried (null = generic "buy credits"). */
  missing: number | null;
  /** The generation type that triggered the paywall, if any. */
  type: GenerationType | null;
}

const STATUS_RANK: Record<GenerationStatus, number> = { queued: 0, processing: 1, completed: 2, failed: 2 };

export function isPendingStatus(status: GenerationStatus): boolean {
  return status === 'queued' || status === 'processing';
}

/** Still worth polling: running, or failed but the refund has not been confirmed yet. */
export function needsPolling(g: GenerationDTO): boolean {
  return isPendingStatus(g.status) || (g.status === 'failed' && !g.refunded);
}

/**
 * Picks the most up-to-date of two snapshots of the same generation (a poll and a conversation
 * reload can race): a final status beats a pending one, a refund beats no refund.
 */
export function newerGeneration(a: GenerationDTO, b: GenerationDTO): GenerationDTO {
  const ra = STATUS_RANK[a.status] ?? 0;
  const rb = STATUS_RANK[b.status] ?? 0;
  if (ra !== rb) return ra > rb ? a : b;
  if (a.refunded !== b.refunded) return a.refunded ? a : b;
  return b;
}
