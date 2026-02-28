import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

const INITIAL_CREDITS = 50;

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_accounts (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

let tableReady = false;

export async function POST(request: NextRequest) {
  try {
    if (!tableReady) {
      await ensureTable();
      tableReady = true;
    }

    const body = await request.json();
    const { action, email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === 'register') {
      const existing = await pool.query(
        'SELECT id FROM user_accounts WHERE email = $1',
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'already_registered',
          message: 'This account is already registered.',
        });
      }

      await pool.query(
        'INSERT INTO user_accounts (email, name, password) VALUES ($1, $2, $3)',
        [normalizedEmail, name || '', password]
      );

      const creditsExist = await pool.query(
        'SELECT id FROM user_credits WHERE email = $1',
        [normalizedEmail]
      );

      if (creditsExist.rows.length === 0) {
        await pool.query(
          'INSERT INTO user_credits (email, name, total_credits, used_credits) VALUES ($1, $2, $3, 0)',
          [normalizedEmail, name || '', INITIAL_CREDITS]
        );
      }

      return NextResponse.json({ success: true, message: 'Account created successfully' });
    }

    if (action === 'login') {
      const user = await pool.query(
        'SELECT id, name, password FROM user_accounts WHERE email = $1',
        [normalizedEmail]
      );

      if (user.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'not_registered',
          message: 'No account found for this email.',
        });
      }

      if (user.rows[0].password !== password) {
        return NextResponse.json({
          success: false,
          error: 'invalid_password',
          message: 'Incorrect password.',
        });
      }

      return NextResponse.json({ success: true, name: user.rows[0].name });
    }

    if (action === 'check_purchase') {
      return NextResponse.json({ success: true, hasPurchase: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Auth] Error:', error?.message || error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
