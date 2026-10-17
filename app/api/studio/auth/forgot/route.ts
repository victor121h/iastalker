import type { NextRequest } from 'next/server';
import { query, tx } from '@/lib/studio/db';
import { enforceRateLimit, getClientIp, json, normalizeEmail, readJson, requestOrigin, route } from '@/lib/studio/http';
import { randomToken, sha256 } from '@/lib/studio/auth';
import { studioEnv } from '@/lib/studio/env';
import { sendPasswordResetEmail } from '@/lib/studio/email';
import { DEFAULT_LANG, isLang } from '@/lib/studio/i18n/define';
import { HOUR } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hostnames the platform tells us we are served from (Replit deployments / workspace). */
function platformHosts(): string[] {
  return [process.env.REPLIT_DOMAINS, process.env.REPLIT_DEV_DOMAIN]
    .filter((v): v is string => !!v)
    .flatMap((v) => v.split(','))
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Base URL for the link in the email. Prefers the configured public URL. Without one, the request
 * origin is only trusted in production when it matches a platform-provided hostname, so a forged
 * Host / X-Forwarded-Host header can't point a victim's reset link at another domain.
 */
function resetBaseUrl(req: NextRequest): string {
  if (process.env.STUDIO_PUBLIC_URL || process.env.NEXT_PUBLIC_STUDIO_URL) return studioEnv.publicUrl();
  const origin = requestOrigin(req);
  if (!studioEnv.isProd) return studioEnv.publicUrl(origin);
  const known = platformHosts();
  const host = hostOf(origin);
  if (host && known.includes(host)) return studioEnv.publicUrl(origin);
  if (known.length > 0) return studioEnv.publicUrl(`https://${known[0]}`);
  console.warn('[studio] STUDIO_PUBLIC_URL is not set — password reset links fall back to the request host.');
  return studioEnv.publicUrl(origin);
}

/**
 * POST /api/studio/auth/forgot {email,lang} → always {ok:true} for a well-formed request, whether
 * or not the account exists. The email is sent in the background so response time is the same.
 */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req, 8 * 1024);
  const email = normalizeEmail(body.email);
  const requestedLang = isLang(body.lang) ? body.lang : null;

  enforceRateLimit(`studio:forgot:ip:${getClientIp(req)}`, 20, HOUR);
  enforceRateLimit(`studio:forgot:email:${email}`, 5, HOUR);

  const { rows } = await query<{ id: string; email: string; name: string; lang: string }>(
    'SELECT id, email, name, lang FROM studio_users WHERE email = $1',
    [email],
  );
  const user = rows[0];

  if (user) {
    const token = randomToken(32);
    await tx(async (c) => {
      // One live link per account: requesting a new one invalidates the previous ones.
      await c.query('DELETE FROM studio_password_resets WHERE user_id = $1', [user.id]);
      await c.query(
        `INSERT INTO studio_password_resets (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [sha256(token), user.id],
      );
    });

    const link = `${resetBaseUrl(req)}/studio/reset-password?token=${encodeURIComponent(token)}`;
    const lang = requestedLang ?? (isLang(user.lang) ? user.lang : DEFAULT_LANG);
    // Fire-and-forget: sendPasswordResetEmail never rejects.
    void sendPasswordResetEmail({ to: user.email, name: user.name, link, lang });
  }

  return json({ ok: true as const });
});
