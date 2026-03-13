import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const isSSL = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_tracking (
      id SERIAL PRIMARY KEY,
      visitor_id VARCHAR(50) NOT NULL,
      session_id VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      current_page VARCHAR(255),
      entry_page VARCHAR(255),
      page_history TEXT DEFAULT '[]',
      is_online BOOLEAN DEFAULT true,
      device VARCHAR(20),
      browser VARCHAR(50),
      referrer TEXT,
      city VARCHAR(100),
      region VARCHAR(100),
      country VARCHAR(10),
      entered_at TIMESTAMP DEFAULT NOW(),
      last_seen TIMESTAMP DEFAULT NOW(),
      page_entered_at TIMESTAMP DEFAULT NOW(),
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
    const { action, sessionId, page, visitorId, device, browser, referrer, name } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    if (action === 'heartbeat') {
      await pool.query(
        `UPDATE visitor_tracking SET last_seen = NOW(), is_online = true WHERE session_id = $1`,
        [sessionId]
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'enter') {
      const existing = await pool.query('SELECT id, page_history FROM visitor_tracking WHERE session_id = $1', [sessionId]);

      if (existing.rows.length > 0) {
        let history: string[] = [];
        try { history = JSON.parse(existing.rows[0].page_history || '[]'); } catch { history = []; }
        if (!history.includes(page)) history.push(page);
        await pool.query(
          `UPDATE visitor_tracking SET current_page = $1, page_history = $2, is_online = true, last_seen = NOW(), page_entered_at = NOW() WHERE session_id = $3`,
          [page, JSON.stringify(history), sessionId]
        );
      } else {
        const now = new Date();
        const brasiliaOffset = -3 * 60;
        const brasiliaTime = new Date(now.getTime() + (now.getTimezoneOffset() + brasiliaOffset) * 60000);
        const day = String(brasiliaTime.getDate()).padStart(2, '0');
        const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
        const hours = brasiliaTime.getHours();
        const minutes = String(brasiliaTime.getMinutes()).padStart(2, '0');
        const baseId = `${day}/${month}-${hours}:${minutes}`;

        let finalId = visitorId || baseId;
        if (!visitorId) {
          const dupes = await pool.query(
            `SELECT COUNT(*) as cnt FROM visitor_tracking WHERE visitor_id LIKE $1`,
            [`${baseId}%`]
          );
          const count = parseInt(dupes.rows[0].cnt);
          if (count > 0) {
            finalId = `${baseId}(${count + 1})`;
          }
        }

        await pool.query(
          `INSERT INTO visitor_tracking (visitor_id, session_id, current_page, entry_page, page_history, device, browser, referrer, is_online, last_seen, page_entered_at)
           VALUES ($1, $2, $3, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
          [finalId, sessionId, page, JSON.stringify([page]), device || 'unknown', browser || 'unknown', referrer || 'direct']
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'leave') {
      await pool.query(
        `UPDATE visitor_tracking SET is_online = false, last_seen = NOW() WHERE session_id = $1`,
        [sessionId]
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_name') {
      await pool.query(
        `UPDATE visitor_tracking SET display_name = $1 WHERE session_id = $2`,
        [name, sessionId]
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!tableReady) {
      await ensureTable();
      tableReady = true;
    }

    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    const adminPw = process.env.ADMIN_MONITOR_PASSWORD || 'admin2024obs';
    if (password !== adminPw) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await pool.query(
      `UPDATE visitor_tracking SET is_online = false WHERE is_online = true AND last_seen < NOW() - INTERVAL '60 seconds'`
    );

    await pool.query(
      `DELETE FROM visitor_tracking WHERE created_at < NOW() - INTERVAL '7 days'`
    );

    const result = await pool.query(
      `SELECT * FROM visitor_tracking WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY last_seen DESC`
    );

    const visitors = result.rows.map(row => ({
      id: row.id,
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      displayName: row.display_name,
      currentPage: row.current_page,
      entryPage: row.entry_page,
      pageHistory: (() => { try { return JSON.parse(row.page_history || '[]'); } catch { return []; } })(),
      isOnline: row.is_online,
      device: row.device,
      browser: row.browser,
      referrer: row.referrer,
      city: row.city,
      region: row.region,
      country: row.country,
      enteredAt: row.entered_at,
      lastSeen: row.last_seen,
      pageEnteredAt: row.page_entered_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ visitors });
  } catch (error) {
    console.error('Tracking GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
