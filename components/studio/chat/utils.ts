// Small client-side helpers for the chat UI (formatting, URLs, ids).
import { BRAND_NAME, type AspectRatio } from '@/lib/studio/plans';
import type { Lang } from '@/lib/studio/i18n/define';

const CHAT_PATH = '/studio/chat';
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export function chatPath(conversationId: string | null): string {
  return conversationId ? `${CHAT_PATH}/${encodeURIComponent(conversationId)}` : CHAT_PATH;
}

/**
 * Conversation id encoded in a chat pathname: null for `/studio/chat`, the id for
 * `/studio/chat/<id>`, undefined for any other path (e.g. while navigating away).
 */
export function conversationIdFromPath(pathname: string | null): string | null | undefined {
  if (!pathname) return undefined;
  const clean = pathname.replace(/\/+$/, '');
  if (clean === CHAT_PATH) return null;
  if (!clean.startsWith(`${CHAT_PATH}/`)) return undefined;
  const rest = clean.slice(CHAT_PATH.length + 1);
  if (!rest || rest.includes('/')) return undefined;
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

export function isValidConversationId(id: string): boolean {
  return ID_RE.test(id);
}

export function localeFor(lang: Lang): string {
  return lang === 'pt' ? 'pt-BR' : 'en-US';
}

/** Compact relative time for the sidebar ("5 min ago", "há 2 h"); older than a week → date. */
export function formatRelativeTime(iso: string, now: number, lang: Lang, justNow: string): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const diffSec = Math.round((time - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return justNow;
  const locale = localeFor(lang);
  let rtf: Intl.RelativeTimeFormat | null = null;
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  } catch {
    rtf = null;
  }
  const fmt = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    rtf ? rtf.format(value, unit) : `${Math.abs(value)} ${unit}`;
  if (abs < 3600) return fmt(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return fmt(Math.round(diffSec / 3600), 'hour');
  if (abs < 7 * 86400) return fmt(Math.round(diffSec / 86400), 'day');
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(locale, sameYear ? { month: 'short', day: 'numeric' } : { dateStyle: 'medium' });
}

/** mm:ss (or h:mm:ss) for elapsed timers. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const RATIO_CSS: Record<AspectRatio, string> = {
  '1:1': '1 / 1',
  '9:16': '9 / 16',
  '16:9': '16 / 9',
};

/** Max display width of generated media per ratio (also bounded by the viewport height). */
export const RATIO_MAX_WIDTH: Record<AspectRatio, string> = {
  '1:1': 'min(420px, 100%, 62vh)',
  '9:16': 'min(300px, 100%, calc(68vh * 9 / 16))',
  '16:9': 'min(620px, 100%)',
};

export function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return url.startsWith('/') && !url.startsWith('//');
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Suggested file name for a download: "<brand>-<short id>.<ext>" (extension only when known). */
export function downloadFileName(id: string, url: string, type: 'image' | 'video'): string {
  const base = `${BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'studio'}-${id.slice(0, 8)}`;
  let ext = '';
  try {
    const path = new URL(url, 'https://x.invalid').pathname.toLowerCase();
    const match = /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/.exec(path);
    if (match) ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  } catch {
    /* keep empty */
  }
  if (!ext && type === 'video') ext = 'mp4';
  return ext ? `${base}.${ext}` : base;
}

let counter = 0;
export function tempId(prefix = 'tmp'): string {
  counter += 1;
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    /* insecure context */
  }
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** First letter for an avatar bubble. */
export function initialOf(name: string, email: string): string {
  const source = (name || email || '?').trim();
  const first = Array.from(source)[0] || '?';
  return first.toUpperCase();
}
