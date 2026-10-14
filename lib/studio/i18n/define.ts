export type Lang = 'en' | 'pt';
export const LANGS: Lang[] = ['en', 'pt'];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_COOKIE = 'studio_lang';

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'pt';
}

/** Picks a language from an Accept-Language header (pt* → pt, everything else → en). */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const first = header.split(',')[0]?.trim().toLowerCase() || '';
  return first.startsWith('pt') ? 'pt' : DEFAULT_LANG;
}

/**
 * Declares a message group. The Portuguese object must contain exactly the same keys as the
 * English one, so a missing translation is a type error.
 *
 *   export const auth = defineMessages({ en: { 'auth.login.title': 'Welcome back' }, pt: { 'auth.login.title': 'Bem-vindo de volta' } });
 *
 * Use `{name}` placeholders for interpolation: t('chat.cost', { credits: 10 }).
 */
export function defineMessages<const T extends Record<string, string>>(m: {
  en: T;
  pt: { [K in keyof T]: string };
}) {
  return m;
}
