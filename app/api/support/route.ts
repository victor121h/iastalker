import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_interactions (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      interaction_type VARCHAR(50) NOT NULL,
      tool_name VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

let tableReady = false;

export async function GET(request: NextRequest) {
  try {
    if (!tableReady) {
      await ensureTable();
      tableReady = true;
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT interaction_type, tool_name, created_at FROM support_interactions WHERE email = $1 ORDER BY created_at DESC`,
      [email]
    );

    return NextResponse.json({ interactions: result.rows });
  } catch (error) {
    console.error('Support GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!tableReady) {
      await ensureTable();
      tableReady = true;
    }

    const body = await request.json();
    const { email, interactionType, toolName } = body;

    if (!email || !interactionType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO support_interactions (email, interaction_type, tool_name) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), interactionType, toolName || null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Support POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
