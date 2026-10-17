// Redirect helpers shared by the auth pages (safe to import from server and client components).
import { isPlanId, type PlanId } from '@/lib/studio/plans';

export const DEFAULT_AFTER_AUTH = '/studio/chat';

/** Auth pages are never a useful destination after logging in (and could loop). */
const AUTH_PATHS = ['/studio/login', '/studio/signup', '/studio/forgot-password', '/studio/reset-password'];

type SearchValue = string | string[] | undefined;

export function firstParam(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Validates a `?next=` value: it must be a same-site path inside the Studio (starts with
 * '/studio', never '//' or a backslash) and not one of the auth pages. Returns null otherwise.
 */
export function safeNextPath(value: SearchValue): string | null {
  const raw = firstParam(value);
  if (typeof raw !== 'string') return null;
  const next = raw.trim();
  if (!next || next.length > 2048) return null;
  if (!next.startsWith('/studio') || next.startsWith('//') || next.includes('\\')) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(next)) return null;
  const rest = next.slice('/studio'.length);
  if (rest && !/^[/?#]/.test(rest)) return null;
  const path = next.split(/[?#]/)[0].replace(/\/+$/, '');
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return next;
}

export function planParam(value: SearchValue): PlanId | null {
  const raw = firstParam(value);
  return isPlanId(raw) ? raw : null;
}

/** Builds a link to another auth page that keeps the `next` and `plan` context. */
export function authHref(
  path: '/studio/login' | '/studio/signup' | '/studio/forgot-password',
  ctx: { next?: string | null; plan?: PlanId | null } = {},
): string {
  const params = new URLSearchParams();
  if (ctx.next) params.set('next', ctx.next);
  if (ctx.plan) params.set('plan', ctx.plan);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
