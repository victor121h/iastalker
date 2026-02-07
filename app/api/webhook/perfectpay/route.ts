import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const PERFECTPAY_TOKEN = process.env.PERFECTPAY_WEBHOOK_TOKEN || '4bac01af77c825b08316691d457c225d';

const PLAN_CREDITS: Record<string, number> = {
  'PPLQQOAPS': 100,
  'PPLQQOJH1': 100,
  'PPLQQOJGQ': 600,
  'PPLQQOJGR': 10000,
  'PPLQQOJGT': 10000,
  'PPLQQOL0B': 10000,
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

    console.log('[PerfectPay Webhook] Processed successfully:', {
      saleCode,
      planCode,
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
