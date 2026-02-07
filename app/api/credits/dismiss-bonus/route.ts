import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await pool.query(
      'UPDATE user_credits SET show_bonus_popup = FALSE WHERE email = $1',
      [email]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Dismiss Bonus] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
