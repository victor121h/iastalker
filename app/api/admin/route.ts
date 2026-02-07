import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export async function GET() {
  try {
    const [webhookCount, creditsCount, recentWebhooks, recentCredits] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM webhook_logs'),
      pool.query('SELECT COUNT(*) as total, SUM(total_credits) as total_credits FROM user_credits'),
      pool.query('SELECT id, sale_code, plan_code, plan_name, sale_status, customer_email, customer_name, credits_added, created_at FROM webhook_logs ORDER BY created_at DESC LIMIT 50'),
      pool.query('SELECT id, email, name, total_credits, used_credits, created_at, updated_at FROM user_credits ORDER BY updated_at DESC LIMIT 50'),
    ]);

    return NextResponse.json({
      stats: {
        total_webhooks: parseInt(webhookCount.rows[0].total),
        total_users: parseInt(creditsCount.rows[0].total),
        total_credits_distributed: parseInt(creditsCount.rows[0].total_credits) || 0,
      },
      recent_webhooks: recentWebhooks.rows,
      user_credits: recentCredits.rows,
    });
  } catch (error: any) {
    console.error('[Admin API] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}
