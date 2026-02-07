import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, utms } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const hasUtms = UTM_KEYS.some(key => utms?.[key]);
    if (!hasUtms) {
      return NextResponse.json({ message: 'No UTMs to save' }, { status: 200 });
    }

    await pool.query(
      `INSERT INTO user_utms (username, utm_source, utm_medium, utm_campaign, utm_term, utm_content, src, sck, xcod, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (username) DO UPDATE SET
         utm_source = COALESCE(NULLIF($2, ''), user_utms.utm_source),
         utm_medium = COALESCE(NULLIF($3, ''), user_utms.utm_medium),
         utm_campaign = COALESCE(NULLIF($4, ''), user_utms.utm_campaign),
         utm_term = COALESCE(NULLIF($5, ''), user_utms.utm_term),
         utm_content = COALESCE(NULLIF($6, ''), user_utms.utm_content),
         src = COALESCE(NULLIF($7, ''), user_utms.src),
         sck = COALESCE(NULLIF($8, ''), user_utms.sck),
         xcod = COALESCE(NULLIF($9, ''), user_utms.xcod),
         updated_at = NOW()`,
      [
        username.toLowerCase(),
        utms?.utm_source || '',
        utms?.utm_medium || '',
        utms?.utm_campaign || '',
        utms?.utm_term || '',
        utms?.utm_content || '',
        utms?.src || '',
        utms?.sck || '',
        utms?.xcod || '',
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving UTMs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT utm_source, utm_medium, utm_campaign, utm_term, utm_content, src, sck, xcod FROM user_utms WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ utms: null });
    }

    const row = result.rows[0];
    const utms: Record<string, string> = {};
    UTM_KEYS.forEach(key => {
      if (row[key]) utms[key] = row[key];
    });

    return NextResponse.json({ utms: Object.keys(utms).length > 0 ? utms : null });
  } catch (error) {
    console.error('Error fetching UTMs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
