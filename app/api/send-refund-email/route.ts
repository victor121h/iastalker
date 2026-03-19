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
      subject: 'Refund Confirmed - AI Ghost',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333333; font-size: 24px; margin-bottom: 8px;">Refund Confirmed</h1>
          </div>

          <p style="font-size: 15px; line-height: 1.8; color: #444444;">Your refund has been approved and should be processed within <strong>5 to 12 business days</strong>.</p>

          <p style="font-size: 15px; line-height: 1.8; color: #444444;">If you wish to cancel the refund and continue using the service, please contact our support.</p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

          <div style="text-align: center;">
            <p style="font-size: 12px; color: #999999; margin-bottom: 8px;">AI Ghost - All rights reserved</p>
            <p style="font-size: 11px; color: #999999;">
              <a href="mailto:contact@aitracker.com?subject=Support" style="color: #999999; text-decoration: underline;">Contact Support</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Refund Email] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
