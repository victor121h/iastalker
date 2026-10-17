// Server-only transactional email for the Studio (password reset). Never throws to the caller:
// a failed delivery is logged, and outside production the reset link is printed to the console
// so the flow can be tested without an email provider.
import { Resend } from 'resend';
import { getUncachableResendClient } from '@/lib/resendClient';
import { BRAND_NAME, SUPPORT_EMAIL } from './plans';
import { translate, type MessageKey, type TranslateVars } from './i18n';
import type { Lang } from './i18n/define';

const CONNECTOR_TIMEOUT_MS = 8_000;
const SEND_TIMEOUT_MS = 15_000;

interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface Transport {
  name: string;
  client: Resend;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Email transports in order of preference: the Replit Resend connector, then a plain
 * RESEND_API_KEY. A factory that throws or returns null is skipped.
 */
const TRANSPORTS: Array<() => Promise<Transport | null>> = [
  async () => {
    const { client } = await withTimeout(getUncachableResendClient(), CONNECTOR_TIMEOUT_MS, 'Resend connector');
    return { name: 'replit-connector', client };
  },
  async () => {
    const key = process.env.RESEND_API_KEY?.trim();
    return key ? { name: 'resend-api-key', client: new Resend(key) } : null;
  },
];

function fromAddress(): string {
  return process.env.STUDIO_EMAIL_FROM?.trim() || `${BRAND_NAME} <noreply@iastalker.com>`;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Hides most of the local part so production logs don't store full addresses. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Tries each transport until one accepts the message. Returns whether it was handed off. */
async function deliver(message: OutgoingEmail): Promise<boolean> {
  const from = fromAddress();
  for (const factory of TRANSPORTS) {
    let transport: Transport | null;
    try {
      transport = await factory();
    } catch {
      continue; // transport not configured in this environment
    }
    if (!transport) continue;
    try {
      const { error } = await withTimeout(
        transport.client.emails.send({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        SEND_TIMEOUT_MS,
        `Email via ${transport.name}`,
      );
      if (!error) return true;
      console.error(`[studio] Email via ${transport.name} was rejected: ${error.name}: ${error.message}`);
    } catch (err) {
      console.error(`[studio] Email via ${transport.name} failed: ${errorText(err)}`);
    }
  }
  return false;
}

// ── Templates ────────────────────────────────────────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT = "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const DISPLAY_FONT = "'Sora','Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const FIRE = 'linear-gradient(135deg,#FF1F4B 0%,#FF4A2B 50%,#FF8A1F 100%)';

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) || '';
}

export function renderPasswordResetEmail(input: { name: string; link: string; lang: Lang }): Omit<OutgoingEmail, 'to'> {
  const { lang, link } = input;
  const t = (key: MessageKey, vars?: TranslateVars) => translate(lang, key, { brand: BRAND_NAME, ...vars });
  const who = firstName(input.name);
  const greeting = who ? t('auth.email.greeting', { name: who }) : t('auth.email.greetingNoName');

  const subject = t('auth.email.reset.subject');
  const preheader = t('auth.email.reset.preheader');
  const title = t('auth.email.reset.title');
  const body = t('auth.email.reset.body');
  const button = t('auth.email.reset.button');
  const expiry = t('auth.email.reset.expiry');
  const fallback = t('auth.email.reset.fallback');
  const ignore = t('auth.email.reset.ignore');
  const footer = t('auth.email.footer');
  const support = t('auth.email.support', { email: SUPPORT_EMAIL });

  const e = escapeHtml;
  const href = e(link);
  const brandInitial = e(BRAND_NAME.trim().charAt(0).toUpperCase() || 'E');
  const supportHtml = e(support).replace(
    e(SUPPORT_EMAIL),
    `<a href="mailto:${e(SUPPORT_EMAIL)}" style="color:#BFA6AA;text-decoration:underline;">${e(SUPPORT_EMAIL)}</a>`,
  );

  const html = `<!doctype html>
<html lang="${lang === 'pt' ? 'pt-BR' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0507;color:#FBEFF0;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#0A0507;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0507" style="background-color:#0A0507;">
  <tr>
    <td align="center" style="padding:36px 16px 40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 4px 22px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="38" height="38" align="center" valign="middle" bgcolor="#FF4A2B" style="width:38px;height:38px;border-radius:12px;background-color:#FF4A2B;background-image:${FIRE};font-family:${DISPLAY_FONT};font-size:19px;font-weight:800;color:#FFFFFF;line-height:38px;">${brandInitial}</td>
                <td style="padding-left:12px;font-family:${DISPLAY_FONT};font-size:21px;font-weight:700;letter-spacing:-0.3px;color:#FBEFF0;">${e(BRAND_NAME)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#130A0D" style="background-color:#130A0D;border:1px solid #2B171C;border-radius:22px;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td height="4" bgcolor="#FF4A2B" style="height:4px;line-height:4px;font-size:4px;background-color:#FF4A2B;background-image:linear-gradient(90deg,#FF1F4B 0%,#FF4A2B 50%,#FF8A1F 100%);">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:36px 32px 34px 32px;font-family:${FONT};">
                  <h1 style="margin:0 0 18px 0;font-family:${DISPLAY_FONT};font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;color:#FBEFF0;">${e(title)}</h1>
                  <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#FBEFF0;">${e(greeting)}</p>
                  <p style="margin:0;font-size:16px;line-height:1.6;color:#BFA6AA;">${e(body)}</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 22px 0;">
                    <tr>
                      <td align="center" bgcolor="#FF4A2B" style="border-radius:14px;background-color:#FF4A2B;background-image:${FIRE};box-shadow:0 10px 28px -10px rgba(255,31,75,0.7);">
                        <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:14px;">${e(button)}&nbsp;&rarr;</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 26px 0;font-size:14px;line-height:1.6;color:#FFB23F;">${e(expiry)}</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="border-top:1px solid #2B171C;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
                  </table>
                  <p style="margin:22px 0 8px 0;font-size:13px;line-height:1.6;color:#7E666B;">${e(fallback)}</p>
                  <p style="margin:0 0 20px 0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" target="_blank" rel="noopener" style="color:#FF8A1F;text-decoration:underline;">${href}</a></p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#7E666B;">${e(ignore)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 12px 0 12px;font-family:${FONT};">
            <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#7E666B;">${e(footer)}</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#7E666B;">${supportHtml}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `${BRAND_NAME} — ${title}`,
    '',
    greeting,
    '',
    body,
    '',
    `${button}: ${link}`,
    '',
    expiry,
    ignore,
    '',
    '—',
    footer,
    support,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Sends the "reset your password" email in the user's language.
 * Resolves to true when a provider accepted the message; never throws.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  link: string;
  lang: Lang;
}): Promise<boolean> {
  try {
    const content = renderPasswordResetEmail(input);
    if (await deliver({ to: input.to, ...content })) return true;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `\n[studio] No email transport worked (configure the Resend connector or RESEND_API_KEY).\n` +
          `[studio] Password reset link for ${input.to}:\n${input.link}\n`,
      );
    } else {
      console.error(`[studio] Could not send the password reset email to ${maskEmail(input.to)}: no email transport worked.`);
    }
    return false;
  } catch (err) {
    console.error(`[studio] Password reset email error: ${errorText(err)}`);
    return false;
  }
}
