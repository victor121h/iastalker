// Server-only: demo provider used when no FAL_KEY is configured. Jobs "run" for a few seconds and
// complete with a generated placeholder (SVG art for images, a bundled loop for videos).
//
// Test hooks (literal tokens in the prompt):
//   [fail]         the job fails with provider_error when it would have completed (tests refunds)
//   [fail-submit]  the submission itself is rejected (tests the submit-failure refund path)
import type { AspectRatio } from '../plans';
import { ProviderError, type AIProvider, type PollInput, type PollResult, type SubmitInput, type SubmitResult } from './types';

const IMAGE_DURATION_MS = 4_000;
const VIDEO_DURATION_MS = 8_000;

export const MOCK_FAIL_TOKEN = '[fail]';
export const MOCK_SUBMIT_FAIL_TOKEN = '[fail-submit]';
export const MOCK_VIDEO_URL = '/studio/demo-video.mp4';

const RATIOS: AspectRatio[] = ['1:1', '9:16', '16:9'];

export function mockImageUrl(ratio: string, seed: string): string {
  const r = (RATIOS as string[]).includes(ratio) ? ratio : '1:1';
  return `/api/studio/mock/image?ratio=${encodeURIComponent(r)}&seed=${encodeURIComponent(seed)}`;
}

export const mockProvider: AIProvider = {
  name: 'mock',

  async submit(input: SubmitInput): Promise<SubmitResult> {
    const model = input.type === 'video' ? 'mock/video' : 'mock/image';
    if (input.prompt.includes(MOCK_SUBMIT_FAIL_TOKEN)) {
      throw new ProviderError('Mock provider rejected the submission (requested with [fail-submit])', { model });
    }
    return {
      requestId: input.generationId,
      model,
      meta: {
        fail: input.prompt.includes(MOCK_FAIL_TOKEN),
        aspectRatio: input.aspectRatio,
        hasReference: Boolean(input.referenceImageUrl),
      },
    };
  },

  async poll(g: PollInput): Promise<PollResult> {
    const duration = g.type === 'video' ? VIDEO_DURATION_MS : IMAGE_DURATION_MS;
    const elapsed = Date.now() - new Date(g.createdAt).getTime();
    if (elapsed < duration) return { state: 'processing' };
    if (g.meta?.fail === true) {
      return { state: 'failed', errorCode: 'provider_error', message: 'Mock provider failure (requested with [fail])' };
    }
    if (g.type === 'video') return { state: 'completed', resultUrl: MOCK_VIDEO_URL };
    const ratio = typeof g.meta?.aspectRatio === 'string' ? g.meta.aspectRatio : '1:1';
    return { state: 'completed', resultUrl: mockImageUrl(ratio, g.requestId) };
  },

  async cancel(): Promise<void> {
    /* nothing to cancel */
  },
};
