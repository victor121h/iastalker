import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT total_credits, used_credits, name FROM user_credits WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ credits: 0, used: 0, available: 0 });
    }

    const row = result.rows[0];
    const available = (row.total_credits || 0) - (row.used_credits || 0);

    return NextResponse.json({
      credits: row.total_credits || 0,
      used: row.used_credits || 0,
      available: available,
      name: row.name || '',
    });
  } catch (error: any) {
    console.error('[Credits API] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
