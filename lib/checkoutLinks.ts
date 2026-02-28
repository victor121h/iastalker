export function getCheckoutUrl(baseUrl: string, lang: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}lang=${lang}`;
}
