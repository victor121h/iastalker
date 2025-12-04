import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT primeiro_nome FROM leads ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      return NextResponse.json({ 
        primeiro_nome: result.rows[0].primeiro_nome 
      });
    }

    return NextResponse.json({ primeiro_nome: null });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ primeiro_nome: null });
  }
}
