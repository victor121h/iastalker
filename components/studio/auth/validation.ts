// Client-side mirrors of the server's auth validation rules (lib/studio/auth.ts, lib/studio/http.ts).
// The server stays the source of truth; these only give instant feedback.

export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** Reset tokens are 43 base64url characters; anything far off is a truncated / mangled link. */
export function looksLikeResetToken(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(value);
}

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const COMMON_PASSWORDS = [
  'password',
  'passw0rd',
  'senha',
  'qwerty',
  'qwertyuiop',
  'asdfghjk',
  'iloveyou',
  'abcdefgh',
  'abc12345',
  'letmein',
  'welcome',
  'admin123',
  'mudar123',
];

/**
 * Simple strength estimate for the meter: 0 = too short, 1 = weak, 2 = fair, 3 = good, 4 = strong.
 * Rewards length and character variety, punishes repeated/sequential digits and common passwords.
 */
export function passwordStrength(password: string): StrengthLevel {
  if (password.length < PASSWORD_MIN) return 0;
  const lower = password.toLowerCase();
  if (/^(.)\1+$/.test(password) || /^\d+$/.test(password)) return 1;
  if (COMMON_PASSWORDS.some((p) => lower.includes(p)) || /(0123|1234|2345|3456|4567|5678|6789|9876|8765)/.test(lower)) {
    return 1;
  }
  let score = 1;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  // score: 1..6
  if (score <= 2) return 1;
  if (score === 3) return 2;
  if (score === 4) return 3;
  return 4;
}
