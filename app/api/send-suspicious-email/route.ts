import { NextRequest, NextResponse } from 'next/server';
import { getUncachableResendClient } from '@/lib/resendClient';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const { client } = await getUncachableResendClient();

    await client.emails.send({
      from: 'AI Ghost <noreply@iastalker.com>',
      to: email,
      subject: 'We found suspicious messages...',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; font-size: 22px; margin-bottom: 8px;">We Found Suspicious Messages...</h1>
          </div>

          <p style="font-size: 15px; line-height: 1.8; color: #444444;">We analyzed the Instagram account you chose to monitor, and our artificial intelligence has <strong style="color: #dc2626;">detected signs of infidelity</strong>.</p>

          <p style="font-size: 15px; line-height: 1.8; color: #444444;">We have gathered all the evidence to present to you.</p>

          <div style="background-color: #fff3f3; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
            <p style="font-size: 15px; color: #444444; margin-bottom: 12px;"><strong>However, your account has not been verified yet.</strong></p>
            <p style="font-size: 14px; color: #666666;">We will only release the full results after you complete your account verification.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://aighostapp.replit.app/up3?utm_source=email_suspicious" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 6px; text-decoration: none;">Verify My Account Now</a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #666666;">Don't miss this opportunity. The evidence is ready and waiting for you.</p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

          <div style="text-align: center;">
            <p style="font-size: 12px; color: #999999; margin-bottom: 8px;">AI Ghost - All rights reserved</p>
            <p style="font-size: 11px; color: #999999;">You are receiving this email because you registered on our platform.</p>
            <p style="font-size: 11px; color: #999999;">
              <a href="mailto:contact@aitracker.com?subject=Unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from future emails
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Suspicious Email] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
