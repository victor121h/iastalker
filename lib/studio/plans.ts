// Client-safe product configuration for the Studio (AI image & video generation).
// Everything here can be imported from both server and client code — never put secrets here.

export const BRAND_NAME = process.env.NEXT_PUBLIC_STUDIO_BRAND || 'Take It All';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_STUDIO_SUPPORT_EMAIL || 'support@iastalker.com';

export type GenerationType = 'image' | 'video';

/** Credits charged per generation. */
export const GENERATION_COST: Record<GenerationType, number> = {
  image: 10,
  video: 90,
};

export const VIDEO_DURATION_SECONDS = 5;

export type AspectRatio = '1:1' | '9:16' | '16:9';
export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '9:16', '16:9'];

export const MAX_PROMPT_LENGTH = 1500;
/** Max size of a reference image after client-side downscaling (bytes). */
export const MAX_REFERENCE_BYTES = 6 * 1024 * 1024;
/** Longest edge the client downsizes reference images to before upload. */
export const REFERENCE_MAX_EDGE = 1536;

export type PlanId = 'basic' | 'pro' | 'vip';
/** Highest plan a user has ever bought ('free' = never purchased). */
export type Tier = 'free' | PlanId;

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  credits: number;
  /** Marketing badge shown on the card. */
  badge: 'popular' | 'best_value' | null;
  /** Visually emphasised card (the one we want most people to pick). */
  featured: boolean;
  /** Used to compute the user's tier (higher = better). */
  rank: number;
}

/**
 * Pricing ladder (USD):
 *  - Basic  $9.90  → 100 credits  (1 video + 1 image)      $0.099 / credit  — entry / decoy
 *  - Pro    $19.90 → 300 credits  (3 videos + 3 images)    $0.066 / credit  — 2× the price, 3× the credits ("Most popular")
 *  - VIP    $39.90 → 800 credits  (8 videos + 8 images)    $0.050 / credit  — half price per credit ("Best value")
 */
export const PLANS: Plan[] = [
  { id: 'basic', name: 'Basic', priceCents: 990, credits: 100, badge: null, featured: false, rank: 1 },
  { id: 'pro', name: 'Pro', priceCents: 1990, credits: 300, badge: 'popular', featured: true, rank: 2 },
  { id: 'vip', name: 'VIP', priceCents: 3990, credits: 800, badge: 'best_value', featured: false, rank: 3 },
];

export const PLAN_IDS: PlanId[] = PLANS.map((p) => p.id);

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value);
}

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function tierRank(tier: Tier): number {
  return tier === 'free' ? 0 : getPlan(tier).rank;
}

/** Price of one credit in (fractional) cents. */
export function centsPerCredit(plan: Plan): number {
  return plan.priceCents / plan.credits;
}

/** Discount per credit vs. the Basic plan, rounded to a whole percent (Basic = 0). */
export function savingsPercent(plan: Plan): number {
  const base = centsPerCredit(PLANS[0]);
  return Math.round((1 - centsPerCredit(plan) / base) * 100);
}

/** Effective cost of one generation on a given plan, in cents. */
export function costPerGenerationCents(plan: Plan, type: GenerationType): number {
  return centsPerCredit(plan) * GENERATION_COST[type];
}

export function generationsFor(credits: number, type: GenerationType): number {
  return Math.floor(credits / GENERATION_COST[type]);
}

export function formatUSD(cents: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  return `$${(cents / 100).toFixed(decimals)}`;
}
