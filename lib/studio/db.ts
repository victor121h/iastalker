// Server-only Postgres access for the Studio. Tables are prefixed with `studio_` so they never
// collide with the existing AI Ghost tables living in the same database.
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

const isSSL =
  process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const globalForStudio = globalThis as unknown as {
  __studioPool?: Pool;
  __studioSchema?: Promise<void>;
};

export const pool: Pool =
  globalForStudio.__studioPool ??
  (globalForStudio.__studioPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSSL ? { rejectUnauthorized: false } : undefined,
    max: Number.parseInt(process.env.STUDIO_DB_POOL_MAX || '10', 10),
  }));

export function query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<R>(text, params as unknown[] | undefined);
}

/** Runs `fn` inside a transaction (BEGIN/COMMIT, ROLLBACK on error). */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* connection already broken */
    }
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS studio_users (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL DEFAULT '',
  password_hash     TEXT NOT NULL,
  credits           INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  tier              TEXT NOT NULL DEFAULT 'free',
  lang              TEXT NOT NULL DEFAULT 'en',
  terms_accepted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_sessions (
  id          TEXT PRIMARY KEY,              -- sha256(token); the raw token only lives in the cookie
  user_id     BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  ip          TEXT
);
CREATE INDEX IF NOT EXISTS studio_sessions_user_idx ON studio_sessions(user_id);

CREATE TABLE IF NOT EXISTS studio_password_resets (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS studio_credit_ledger (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  delta          INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  reason         TEXT NOT NULL,             -- signup_bonus | purchase | generation | refund | adjustment
  ref_type       TEXT,
  ref_id         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS studio_ledger_user_idx ON studio_credit_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS studio_conversations (
  id          TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS studio_conversations_user_idx ON studio_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_uploads (
  id          TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS studio_uploads_user_idx ON studio_uploads(user_id);

CREATE TABLE IF NOT EXISTS studio_generations (
  id                   TEXT PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  conversation_id      TEXT NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL CHECK (type IN ('image', 'video')),
  prompt               TEXT NOT NULL,
  aspect_ratio         TEXT NOT NULL DEFAULT '1:1',
  cost                 INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  reference_upload_id  TEXT REFERENCES studio_uploads(id) ON DELETE SET NULL,
  reference_url        TEXT,                -- external URL (e.g. a previous result) used as reference
  provider             TEXT NOT NULL,       -- fal | mock
  model                TEXT,
  provider_request_id  TEXT,
  provider_meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  queue_position       INTEGER,
  result_url           TEXT,
  error_code           TEXT,
  error                TEXT,
  refunded             BOOLEAN NOT NULL DEFAULT FALSE,
  last_polled_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS studio_generations_conv_idx ON studio_generations(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS studio_generations_user_status_idx ON studio_generations(user_id, status);

CREATE TABLE IF NOT EXISTS studio_payments (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,              -- stripe | perfectpay | dev
  external_id   TEXT NOT NULL,              -- checkout session id / sale code / dev id
  user_id       BIGINT REFERENCES studio_users(id) ON DELETE SET NULL,
  email         TEXT,
  plan_id       TEXT NOT NULL,
  credits       INTEGER NOT NULL,
  amount_cents  INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'usd',
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | paid | refunded | failed
  credited_at   TIMESTAMPTZ,                -- when credits were actually added to a user
  raw           JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_id)
);
CREATE INDEX IF NOT EXISTS studio_payments_user_idx ON studio_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_payments_email_idx ON studio_payments(email);
`;

/**
 * Creates the Studio tables if needed. Cached per process; safe to call on every request.
 * If it fails (e.g. DB unreachable) the cache is cleared so the next request retries.
 */
export function ensureSchema(): Promise<void> {
  if (!globalForStudio.__studioSchema) {
    globalForStudio.__studioSchema = (async () => {
      const client = await pool.connect();
      try {
        // Serialise concurrent cold starts that race on CREATE TABLE IF NOT EXISTS.
        await client.query('SELECT pg_advisory_lock(727274001)');
        try {
          await client.query(SCHEMA_SQL);
        } finally {
          await client.query('SELECT pg_advisory_unlock(727274001)');
        }
      } finally {
        client.release();
      }
    })().catch((err) => {
      globalForStudio.__studioSchema = undefined;
      throw err;
    });
  }
  return globalForStudio.__studioSchema;
}
