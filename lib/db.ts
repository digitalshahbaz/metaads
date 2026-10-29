import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: Promise<void> | undefined;
}

function client() {
  if (!globalThis.__sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See README for setup.");
    const local = /localhost|127\.0\.0\.1/.test(url);
    globalThis.__sql = postgres(url, {
      ssl: local ? false : "require",
      max: 5,
      idle_timeout: 20,
      prepare: false, // works with pgbouncer / Neon pooled URLs
    });
  }
  return globalThis.__sql;
}

async function createSchema(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT,
      phone       TEXT,
      company     TEXT,
      source      TEXT NOT NULL DEFAULT 'manual',
      status      TEXT NOT NULL DEFAULT 'new',
      value       NUMERIC(12,2) NOT NULL DEFAULT 0,
      tags        TEXT[] NOT NULL DEFAULT '{}',
      notes       TEXT,
      follow_up   DATE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id          SERIAL PRIMARY KEY,
      lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      type        TEXT NOT NULL DEFAULT 'note',
      content     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_created_idx ON leads(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS activities_lead_idx ON lead_activities(lead_id, created_at DESC)`;
}

/** Returns a ready-to-use client; creates tables on first use. */
export async function db() {
  const sql = client();
  if (!globalThis.__schemaReady) {
    globalThis.__schemaReady = createSchema(sql).catch((e) => {
      globalThis.__schemaReady = undefined;
      throw e;
    });
  }
  await globalThis.__schemaReady;
  return sql;
}
