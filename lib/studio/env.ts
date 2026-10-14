// Server-only environment configuration for the Studio. Do not import from client components.
import type { PaymentProvider, StudioPublicConfig } from './types';
import { PLAN_IDS, type PlanId } from './plans';

function flag(name: string): boolean | undefined {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === '') return undefined;
  return v === '1' || v === 'true' || v === 'yes';
}

const isProd = process.env.NODE_ENV === 'production';

export const studioEnv = {
  isProd,

  // ── AI provider ────────────────────────────────────────────────────────────
  falKey(): string | undefined {
    return process.env.FAL_KEY || process.env.FAL_API_KEY || undefined;
  },
  /** 'fal' when a key is configured (or forced), otherwise 'mock' (demo results). */
  aiProvider(): 'fal' | 'mock' {
    const forced = process.env.STUDIO_AI_PROVIDER?.trim().toLowerCase();
    if (forced === 'mock') return 'mock';
    if (forced === 'fal') return 'fal';
    return this.falKey() ? 'fal' : 'mock';
  },
  /** fal.ai model endpoints — override with env vars when newer models ship. */
  falModels() {
    return {
      image: process.env.STUDIO_FAL_MODEL_IMAGE || 'fal-ai/flux/dev',
      imageWithReference: process.env.STUDIO_FAL_MODEL_IMAGE_REF || 'fal-ai/flux-pro/kontext',
      video: process.env.STUDIO_FAL_MODEL_VIDEO || 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
      videoWithReference:
        process.env.STUDIO_FAL_MODEL_VIDEO_REF || 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    };
  },

  // ── Credits ────────────────────────────────────────────────────────────────
  /** Free credits granted on sign-up (default 10 = one free image). */
  signupBonus(): number {
    const raw = process.env.STUDIO_SIGNUP_BONUS;
    const n = raw === undefined || raw === '' ? 10 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 10;
  },
  /** Max generations a user may have queued/processing at once. */
  maxActiveGenerations(): number {
    const n = Number.parseInt(process.env.STUDIO_MAX_ACTIVE_GENERATIONS || '3', 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || undefined,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    };
  },
  perfectpay() {
    const checkoutUrls = {} as Record<PlanId, string | undefined>;
    const planCodes: Record<string, PlanId> = {};
    for (const id of PLAN_IDS) {
      const key = id.toUpperCase();
      checkoutUrls[id] = process.env[`STUDIO_PERFECTPAY_URL_${key}`] || undefined;
      // Comma-separated list of PerfectPay plan/product codes that map to this plan.
      for (const code of (process.env[`STUDIO_PERFECTPAY_CODES_${key}`] || '').split(',')) {
        const c = code.trim();
        if (c) planCodes[c] = id;
      }
    }
    return {
      token: process.env.STUDIO_PERFECTPAY_TOKEN || undefined,
      checkoutUrls,
      planCodes,
    };
  },
  /** Simulated purchases (no real money). On by default outside production only. */
  devPurchasesEnabled(): boolean {
    const f = flag('STUDIO_DEV_PURCHASES');
    if (f !== undefined) return f;
    return !isProd;
  },
  paymentProvider(): PaymentProvider | 'none' {
    const forced = process.env.STUDIO_PAYMENT_PROVIDER?.trim().toLowerCase();
    if (forced === 'stripe' || forced === 'perfectpay' || forced === 'dev') return forced;
    if (this.stripe().secretKey) return 'stripe';
    const pp = this.perfectpay();
    if (PLAN_IDS.every((id) => pp.checkoutUrls[id])) return 'perfectpay';
    if (this.devPurchasesEnabled()) return 'dev';
    return 'none';
  },

  /** Public base URL (used for payment redirects and emails). */
  publicUrl(fallbackOrigin?: string): string {
    const explicit = process.env.STUDIO_PUBLIC_URL || process.env.NEXT_PUBLIC_STUDIO_URL;
    const base = explicit || fallbackOrigin || 'http://localhost:5000';
    return base.replace(/\/+$/, '');
  },

  publicConfig(): StudioPublicConfig {
    return {
      aiProvider: this.aiProvider(),
      paymentProvider: this.paymentProvider(),
      signupBonus: this.signupBonus(),
    };
  },
};
