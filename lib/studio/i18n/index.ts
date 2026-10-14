import { type Lang } from './define';
import { common } from './messages/common';
import { auth } from './messages/auth';
import { chat } from './messages/chat';
import { landing } from './messages/landing';
import { pricing } from './messages/pricing';
import { account } from './messages/account';
import { legal } from './messages/legal';
import { checkout } from './messages/checkout';

const en = {
  ...common.en,
  ...auth.en,
  ...chat.en,
  ...landing.en,
  ...pricing.en,
  ...account.en,
  ...legal.en,
  ...checkout.en,
};

const pt: Record<keyof typeof en, string> = {
  ...common.pt,
  ...auth.pt,
  ...chat.pt,
  ...landing.pt,
  ...pricing.pt,
  ...account.pt,
  ...legal.pt,
  ...checkout.pt,
};

export type MessageKey = keyof typeof en;
export type TranslateVars = Record<string, string | number>;

export const messages: Record<Lang, Record<MessageKey, string>> = { en, pt };

export function translate(lang: Lang, key: MessageKey, vars?: TranslateVars): string {
  const template = messages[lang]?.[key] ?? messages.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/** Translates an API error code ('insufficient_credits', …) to a user-facing message. */
export function errorMessage(lang: Lang, code: string | null | undefined): string {
  const key = `errors.${code}` as MessageKey;
  return key in messages.en ? translate(lang, key) : translate(lang, 'errors.internal');
}

export * from './define';
