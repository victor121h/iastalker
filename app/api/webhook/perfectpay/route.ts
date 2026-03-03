import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getUncachableResendClient } from '@/lib/resendClient';

const PERFECTPAY_TOKEN = process.env.PERFECTPAY_WEBHOOK_TOKEN || 'f71e05f3f70c465c7c01fb8ce2b327b7';

const EMAIL_PRODUCT_CODE = 'PPPBEB3B';

async function sendPurchaseEmail(customerEmail: string, customerName: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const firstName = customerName ? customerName.split(' ')[0] : '';
    const greeting = firstName ? `Hello ${firstName}, and welcome` : 'Hello and welcome';

    await client.emails.send({
      from: 'IA Observer <noreply@iastalker.com>',
      to: customerEmail,
      subject: '🎉 Access Granted Successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0f; color: #ffffff; padding: 40px 30px; border-radius: 12px;">
          <h1 style="color: #10b981; font-size: 28px; margin-bottom: 20px;">🎉 Access Granted Successfully!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">${greeting} 👋</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">Congratulations on your purchase! Your access to <strong style="color: #a78bfa;">IA Observer</strong> has been successfully activated, and you can now start using all the features available on the platform.</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">This product was designed to deliver a complete, secure, and intuitive experience, allowing you to explore advanced observation, analysis, and monitoring tools powered by artificial intelligence in a simple and efficient way.</p>
          
          <div style="background-color: #1a1a2e; border: 1px solid #333; border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center;">
            <p style="font-size: 16px; color: #d1d5db; margin-bottom: 16px;">🔐 <strong>How to Access IA Observer</strong></p>
            <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">To get started right now, simply click the link below:</p>
            <a href="https://aiobserver.replit.app/access" style="display: inline-block; background: linear-gradient(to right, #10b981, #14b8a6); color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none;">👉 Access IA Observer Now</a>
          </div>
          
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">© 2024 IA Observer - All rights reserved</p>
        </div>
      `,
    });

    console.log('[PerfectPay Webhook] Purchase email sent to:', customerEmail);
  } catch (emailError: any) {
    console.error('[PerfectPay Webhook] Failed to send email:', emailError?.message || emailError);
  }
}

const PLAN_CREDITS: Record<string, number> = {
  'PPLQQOQML': 100,
  'PPLQQOQQ8': 100,
  'PPLQQOQQ9': 600,
  'PPLQQOQQA': 10000,
  'PPLQQOQQB': 10000,
};

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[PerfectPay Webhook] Received:', JSON.stringify({
      token: body.token ? '***' : 'missing',
      code: body.code,
      sale_status_enum: body.sale_status_enum,
      plan_code: body.plan?.code,
      customer_email: body.customer?.email,
    }));

    if (body.token !== PERFECTPAY_TOKEN) {
      console.error('[PerfectPay Webhook] Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const saleCode = body.code || '';
    const saleStatus = body.sale_status_enum;
    const saleStatusDetail = body.sale_status_detail || '';
    const planCode = body.plan?.code || '';
    const planName = body.plan?.name || '';
    const customerEmail = body.customer?.email?.toLowerCase() || '';
    const customerName = body.customer?.full_name || '';
    const customerPhone = body.customer?.phone_area_code && body.customer?.phone_number 
      ? `${body.customer.phone_area_code}${body.customer.phone_number}` 
      : '';
    const saleAmount = body.sale_amount || 0;

    const isApproved = saleStatus === 2 || saleStatus === 10;

    let creditsToAdd = 0;
    if (isApproved && PLAN_CREDITS[planCode]) {
      creditsToAdd = PLAN_CREDITS[planCode];
    }

    let bonusCredits = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM webhook_logs WHERE sale_code = $1 AND credits_added > 0 FOR UPDATE',
        [saleCode]
      );

      if (existing.rows.length > 0 && creditsToAdd > 0) {
        console.log('[PerfectPay Webhook] Credits already added for sale:', saleCode);
        creditsToAdd = 0;
      }

      await client.query(
        `INSERT INTO webhook_logs (source, event_type, sale_code, plan_code, plan_name, sale_status, sale_status_detail, customer_email, customer_name, customer_phone, sale_amount, credits_added, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          'perfectpay',
          isApproved ? 'approved' : saleStatusDetail || 'other',
          saleCode,
          planCode,
          planName,
          saleStatus,
          saleStatusDetail,
          customerEmail,
          customerName,
          customerPhone,
          saleAmount,
          creditsToAdd,
          JSON.stringify(body),
        ]
      );
      if (creditsToAdd > 0 && customerEmail) {
        if (creditsToAdd === 600) {
          const userRow = await client.query(
            'SELECT first_recharge_done FROM user_credits WHERE email = $1',
            [customerEmail]
          );
          const isFirstRecharge = userRow.rows.length === 0 || !userRow.rows[0].first_recharge_done;
          if (isFirstRecharge) {
            bonusCredits = 200;
          }
        }

        const totalToAdd = creditsToAdd + bonusCredits;
        await client.query(
          `INSERT INTO user_credits (email, name, total_credits, first_recharge_done, show_bonus_popup, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (email) DO UPDATE SET
             total_credits = user_credits.total_credits + $3,
             first_recharge_done = CASE WHEN $4 THEN TRUE ELSE user_credits.first_recharge_done END,
             show_bonus_popup = CASE WHEN $5 THEN TRUE ELSE user_credits.show_bonus_popup END,
             name = COALESCE(NULLIF($2, ''), user_credits.name),
             updated_at = NOW()`,
          [customerEmail, customerName, totalToAdd, bonusCredits > 0, bonusCredits > 0]
        );

        console.log('[PerfectPay Webhook] Added', totalToAdd, 'credits (bonus:', bonusCredits, ') for', customerEmail);
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    const productCode = body.product?.code || '';
    if (isApproved && productCode === EMAIL_PRODUCT_CODE && customerEmail) {
      sendPurchaseEmail(customerEmail, customerName);
    }

    console.log('[PerfectPay Webhook] Processed successfully:', {
      saleCode,
      planCode,
      productCode,
      status: saleStatus,
      creditsAdded: creditsToAdd,
      email: customerEmail,
    });

    return NextResponse.json({ success: true, credits_added: creditsToAdd + bonusCredits, bonus: bonusCredits });
  } catch (error: any) {
    console.error('[PerfectPay Webhook] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    message: 'PerfectPay webhook endpoint is active. Send POST requests with sale data.',
  });
}
