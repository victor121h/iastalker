import type { Lang } from '@/lib/studio/i18n';

/**
 * Formats an integer with the UI language's grouping ("1,250" / "1.250"). Always pass an explicit
 * locale: a bare toLocaleString() renders differently on the server and in the browser, which
 * breaks hydration.
 */
export function formatCount(value: number, lang: Lang): string {
  return value.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
}
