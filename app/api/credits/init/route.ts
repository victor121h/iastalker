import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

const INITIAL_CREDITS = 125;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase();
    const name = body.name || '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existing = await pool.query(
      'SELECT id FROM user_credits WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: true, message: 'Account already exists', credits: 0 });
    }

    await pool.query(
      'INSERT INTO user_credits (email, name, total_credits, used_credits) VALUES ($1, $2, $3, 0)',
      [email, name, INITIAL_CREDITS]
    );

    return NextResponse.json({ success: true, credits: INITIAL_CREDITS });
  } catch (error: any) {
    console.error('[Credits Init] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
