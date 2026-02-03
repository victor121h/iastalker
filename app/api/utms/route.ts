import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, utms } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const query = `
      INSERT INTO user_utms (username, utm_source, utm_medium, utm_campaign, utm_term, utm_content, src, sck, xcod, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (username) 
      DO UPDATE SET 
        utm_source = COALESCE(EXCLUDED.utm_source, user_utms.utm_source),
        utm_medium = COALESCE(EXCLUDED.utm_medium, user_utms.utm_medium),
        utm_campaign = COALESCE(EXCLUDED.utm_campaign, user_utms.utm_campaign),
        utm_term = COALESCE(EXCLUDED.utm_term, user_utms.utm_term),
        utm_content = COALESCE(EXCLUDED.utm_content, user_utms.utm_content),
        src = COALESCE(EXCLUDED.src, user_utms.src),
        sck = COALESCE(EXCLUDED.sck, user_utms.sck),
        xcod = COALESCE(EXCLUDED.xcod, user_utms.xcod),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      username.toLowerCase(),
      utms.utm_source || null,
      utms.utm_medium || null,
      utms.utm_campaign || null,
      utms.utm_term || null,
      utms.utm_content || null,
      utms.src || null,
      utms.sck || null,
      utms.xcod || null,
    ];

    const result = await pool.query(query, values);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving UTMs:', error);
    return NextResponse.json({ error: 'Failed to save UTMs' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const query = 'SELECT * FROM user_utms WHERE username = $1';
    const result = await pool.query(query, [username.toLowerCase()]);

    if (result.rows.length === 0) {
      return NextResponse.json({ utms: null });
    }

    const row = result.rows[0];
    const utms: Record<string, string> = {};
    
    if (row.utm_source) utms.utm_source = row.utm_source;
    if (row.utm_medium) utms.utm_medium = row.utm_medium;
    if (row.utm_campaign) utms.utm_campaign = row.utm_campaign;
    if (row.utm_term) utms.utm_term = row.utm_term;
    if (row.utm_content) utms.utm_content = row.utm_content;
    if (row.src) utms.src = row.src;
    if (row.sck) utms.sck = row.sck;
    if (row.xcod) utms.xcod = row.xcod;

    return NextResponse.json({ utms });
  } catch (error) {
    console.error('Error fetching UTMs:', error);
    return NextResponse.json({ error: 'Failed to fetch UTMs' }, { status: 500 });
  }
}
