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
      subject: 'Your Access Has Been Granted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333333; font-size: 24px; margin-bottom: 8px;">Access Granted Successfully</h1>
            <p style="color: #666666; font-size: 14px;">Your IA Observer account is ready</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.8; color: #444444;">${greeting},</p>
          
          <p style="font-size: 15px; line-height: 1.8; color: #444444;">Thank you for your purchase. Your access to <strong>IA Observer</strong> has been successfully activated. You can now use all the features available on the platform.</p>
          
          <p style="font-size: 15px; line-height: 1.8; color: #444444;">IA Observer provides a complete and intuitive experience with advanced observation, analysis, and monitoring tools to help you get the information you need.</p>
          
          <div style="background-color: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
            <p style="font-size: 15px; color: #444444; margin-bottom: 16px;"><strong>How to Access IA Observer</strong></p>
            <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">Use the link below to get started:</p>
            <a href="https://aiobserver.replit.app/access" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: bold; font-size: 15px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">Access IA Observer</a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #666666;">If you have any questions or need help, reply to this email and our team will assist you.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #999999; margin-bottom: 8px;">IA Observer - All rights reserved</p>
            <p style="font-size: 11px; color: #999999;">You are receiving this email because you made a purchase on our platform.</p>
            <p style="font-size: 11px; color: #999999;">
              <a href="mailto:contact@aitracker.com?subject=Unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from future emails
            </p>
          </div>
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
