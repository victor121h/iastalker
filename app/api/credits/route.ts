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
      'SELECT total_credits, used_credits, name, unlocked_all, show_bonus_popup FROM user_credits WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ credits: 0, used: 0, available: 0, unlocked_all: false, show_bonus_popup: false });
    }

    const row = result.rows[0];
    const available = (row.total_credits || 0) - (row.used_credits || 0);
    let unlockedAll = row.unlocked_all || false;

    if (!unlockedAll && available >= 999) {
      await pool.query(
        'UPDATE user_credits SET unlocked_all = TRUE WHERE email = $1',
        [email]
      );
      unlockedAll = true;
    }

    return NextResponse.json({
      credits: row.total_credits || 0,
      used: row.used_credits || 0,
      available: available,
      name: row.name || '',
      unlocked_all: unlockedAll,
      show_bonus_popup: row.show_bonus_popup || false,
    });
  } catch (error: any) {
    console.error('[Credits API] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase();
    const amount = body.amount;

    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Email and valid amount are required' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT total_credits, used_credits FROM user_credits WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No credits found', success: false }, { status: 400 });
    }

    const row = result.rows[0];
    const available = (row.total_credits || 0) - (row.used_credits || 0);

    if (available < amount) {
      return NextResponse.json({ error: 'Insufficient credits', success: false, available }, { status: 400 });
    }

    await pool.query(
      'UPDATE user_credits SET used_credits = used_credits + $1, updated_at = NOW() WHERE email = $2',
      [amount, email]
    );

    return NextResponse.json({
      success: true,
      deducted: amount,
      available: available - amount,
    });
  } catch (error: any) {
    console.error('[Credits API] Deduct error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
