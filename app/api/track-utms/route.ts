import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ ok: true });
    }

    const utms: Record<string, string> = {};
    UTM_KEYS.forEach(key => {
      const value = searchParams.get(key);
      if (value) utms[key] = value;
    });

    const hasUtms = Object.keys(utms).length > 0;
    if (!hasUtms) {
      return NextResponse.json({ ok: true });
    }

    console.log('[track-utms] Saving UTMs for', username, utms);

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
        utms.utm_source || '',
        utms.utm_medium || '',
        utms.utm_campaign || '',
        utms.utm_term || '',
        utms.utm_content || '',
        utms.src || '',
        utms.sck || '',
        utms.xcod || '',
      ]
    );

    console.log('[track-utms] Saved successfully for', username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track-utms] Error:', error);
    return NextResponse.json({ ok: true });
  }
}
