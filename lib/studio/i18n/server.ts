// Server-only: resolves the visitor's language from the cookie or Accept-Language header.
import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, isLang, langFromAcceptLanguage, type Lang } from './define';

export function getRequestLang(): Lang {
  const fromCookie = cookies().get(LANG_COOKIE)?.value;
  if (isLang(fromCookie)) return fromCookie;
  return langFromAcceptLanguage(headers().get('accept-language'));
}
