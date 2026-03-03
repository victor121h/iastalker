import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getUncachableResendClient } from '@/lib/resendClient';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

const CRON_SECRET = process.env.CRON_SECRET || 'cron_secret_key_2024';

async function sendSupportFollowup(email: string, name: string) {
  const { client } = await getUncachableResendClient();

  await client.emails.send({
    from: 'IA Observer Support <noreply@iastalker.com>',
    to: email,
    subject: 'IA Observer Support',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333333; font-size: 22px; margin-bottom: 8px;">IA Observer Support</h1>
        </div>

        <p style="font-size: 15px; line-height: 1.8; color: #444444;">Hi,</p>

        <p style="font-size: 15px; line-height: 1.8; color: #444444;">This is Lucia from the IA Observer support team. I noticed that you haven't completed your account verification yet.</p>

        <div style="background-color: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
          <p style="font-size: 15px; color: #444444; margin-bottom: 16px;"><strong>Verify your account now</strong></p>
          <a href="https://aiobserver.replit.app/up3?utm_source=email2" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: bold; font-size: 15px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">Verify Now</a>
        </div>

        <p style="font-size: 14px; line-height: 1.8; color: #444444;">Please note that not completing the payment will result in errors and limitations within our platform. If you have already paid and are still experiencing issues, please make the payment again to resolve it and we will refund the amount right away.</p>

        <p style="font-size: 14px; line-height: 1.6; color: #666666;">Best regards,<br/>Lucia - IA Observer Support Team</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 12px; color: #999999; margin-bottom: 8px;">IA Observer - All rights reserved</p>
          <p style="font-size: 11px; color: #999999;">You are receiving this email because you registered on our platform.</p>
          <p style="font-size: 11px; color: #999999;">
            <a href="mailto:contact@aitracker.com?subject=Unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from future emails
          </p>
        </div>
      </div>
    `,
  });
}

async function sendRegistrationFollowup(email: string, name: string) {
  const { client } = await getUncachableResendClient();
  const firstName = name ? name.split(' ')[0] : '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';

  await client.emails.send({
    from: 'IA Observer <noreply@iastalker.com>',
    to: email,
    subject: 'Important Alert About Your Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; font-size: 22px; margin-bottom: 8px;">You Are Being Cheated On</h1>
        </div>

        <p style="font-size: 15px; line-height: 1.8; color: #444444;">${greeting},</p>

        <p style="font-size: 15px; line-height: 1.8; color: #444444;">Our artificial intelligence has detected messages about <strong>infidelity</strong> and <strong>sensitive content</strong> in WhatsApp conversations.</p>

        <div style="background-color: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
          <p style="font-size: 15px; color: #444444; margin-bottom: 16px;"><strong>Find out everything now</strong></p>
          <a href="https://aiobserver.replit.app/cadastro?utm_source=email1" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: bold; font-size: 15px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">Discover the Truth</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 12px; color: #999999; margin-bottom: 8px;">IA Observer - All rights reserved</p>
          <p style="font-size: 11px; color: #999999;">You are receiving this email because you registered on our platform.</p>
          <p style="font-size: 11px; color: #999999;">
            <a href="mailto:contact@aitracker.com?subject=Unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from future emails
          </p>
        </div>
      </div>
    `,
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const urlSecret = request.nextUrl.searchParams.get('secret');

  if (authHeader !== `Bearer ${CRON_SECRET}` && urlSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pending = await pool.query(
      `SELECT id, email, name, email_type FROM pending_emails
       WHERE sent = FALSE AND send_at <= NOW()
       ORDER BY send_at ASC
       LIMIT 20`
    );

    let sent = 0;
    let failed = 0;

    for (const row of pending.rows) {
      try {
        if (row.email_type === 'registration_followup') {
          await sendRegistrationFollowup(row.email, row.name);
        } else if (row.email_type === 'support_followup') {
          await sendSupportFollowup(row.email, row.name);
        }
        await pool.query('UPDATE pending_emails SET sent = TRUE WHERE id = $1', [row.id]);
        sent++;
        console.log('[Cron] Email sent to:', row.email);
      } catch (err: any) {
        failed++;
        console.error('[Cron] Failed to send email to:', row.email, err?.message);
      }
    }

    return NextResponse.json({ success: true, processed: pending.rows.length, sent, failed });
  } catch (error: any) {
    console.error('[Cron] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
