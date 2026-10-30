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
      onnotice: () => {}, // silence "already exists, skipping" from schema setup
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

  // v2: business segregation, funnels, purchases, scoring, qualification details.
  await sql`
    ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS business     TEXT NOT NULL DEFAULT 'dmm',
      ADD COLUMN IF NOT EXISTS funnels      TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_customer  BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_spent  NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS purchases    JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS score        INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS temperature  TEXT NOT NULL DEFAULT 'cold',
      ADD COLUMN IF NOT EXISTS profession   TEXT,
      ADD COLUMN IF NOT EXISTS city         TEXT,
      ADD COLUMN IF NOT EXISTS details      JSONB NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS last_seen    TIMESTAMPTZ`;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_touchpoints (
      id          SERIAL PRIMARY KEY,
      lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      business    TEXT NOT NULL,
      funnel      TEXT NOT NULL,
      sheet       TEXT,
      captured_at TIMESTAMPTZ,
      purchase    JSONB
    )`;
  await sql`CREATE INDEX IF NOT EXISTS leads_business_idx ON leads(business)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(lower(email))`;
  await sql`CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone)`;
  await sql`CREATE INDEX IF NOT EXISTS touchpoints_lead_idx ON lead_touchpoints(lead_id, captured_at)`;

  // v3: team, ownership, UTM tracking, call logging, tasks, deals, views, custom fields, templates.
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role          TEXT NOT NULL DEFAULT 'caller',
      active        BOOLEAN NOT NULL DEFAULT true,
      last_login    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS owner_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS custom            JSONB NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS utm_source        TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium        TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign      TEXT,
      ADD COLUMN IF NOT EXISTS utm_content       TEXT,
      ADD COLUMN IF NOT EXISTS utm_term          TEXT,
      ADD COLUMN IF NOT EXISTS entries           INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS call_count        INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_call_at      TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_call_outcome TEXT`;
  await sql`
    ALTER TABLE lead_touchpoints
      ADD COLUMN IF NOT EXISTS utm_source   TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
      ADD COLUMN IF NOT EXISTS utm_content  TEXT,
      ADD COLUMN IF NOT EXISTS utm_term     TEXT,
      ADD COLUMN IF NOT EXISTS page_url     TEXT`;
  await sql`
    ALTER TABLE lead_activities
      ADD COLUMN IF NOT EXISTS user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS outcome      TEXT,
      ADD COLUMN IF NOT EXISTS duration_sec INTEGER`;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      lead_id     INTEGER REFERENCES leads(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      due_at      TIMESTAMPTZ NOT NULL,
      done_at     TIMESTAMPTZ,
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id             SERIAL PRIMARY KEY,
      lead_id        INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      title          TEXT NOT NULL,
      business       TEXT NOT NULL DEFAULT 'dmm',
      amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
      stage          TEXT NOT NULL DEFAULT 'open',
      owner_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expected_close DATE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at      TIMESTAMPTZ
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS saved_views (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      query      TEXT NOT NULL,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      shared     BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id            SERIAL PRIMARY KEY,
      key           TEXT NOT NULL UNIQUE,
      label         TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'text',
      options       TEXT[] NOT NULL DEFAULT '{}',
      show_in_table BOOLEAN NOT NULL DEFAULT true,
      position      INTEGER NOT NULL DEFAULT 0
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      channel    TEXT NOT NULL DEFAULT 'whatsapp',
      business   TEXT NOT NULL DEFAULT 'any',
      subject    TEXT,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads(owner_id)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_last_seen_idx ON leads(last_seen DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS touchpoints_time_idx ON lead_touchpoints(captured_at)`;
  await sql`CREATE INDEX IF NOT EXISTS activities_type_time_idx ON lead_activities(type, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id, done_at, due_at)`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_lead_idx ON tasks(lead_id)`;
  await sql`CREATE INDEX IF NOT EXISTS deals_lead_idx ON deals(lead_id)`;
  await sql`UPDATE leads l SET entries = GREATEST(1, (SELECT count(*) FROM lead_touchpoints t WHERE t.lead_id = l.id))`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM custom_fields`;
  if (n === 0) {
    await sql`INSERT INTO custom_fields (key, label, type, options, position) VALUES
      ('interested_in', 'Interested in', 'select', ${["DFY Ads Service", "VSW Program", "Meta Ads Mastery", "Masterclass", "Not interested"]}, 1),
      ('lead_quality', 'Lead quality', 'select', ${["Good fit", "Maybe", "Not a fit", "Junk"]}, 2),
      ('budget', 'Budget', 'select', ${["< ₹10K", "₹10K–50K", "₹50K–2L", "₹2L+"]}, 3)`;
  }
  const [{ t }] = await sql`SELECT count(*)::int AS t FROM templates`;
  if (t === 0) {
    await sql`INSERT INTO templates (name, channel, business, subject, body) VALUES
      ('First call follow-up', 'whatsapp', 'any', NULL,
       ${"Hi {first_name}, this is {my_name} from {business}. Thanks for your time on the call today! As discussed, here are the details. Let me know if you have any questions 🙂"}),
      ('Didn''t pick up', 'whatsapp', 'any', NULL,
       ${"Hi {first_name}, I tried calling you regarding your enquiry with {business}. When is a good time to talk? 🙂"}),
      ('Book a growth call (DMM)', 'whatsapp', 'dmm', NULL,
       ${"Hi {first_name}! You applied for a growth call with Digimark Media. We help coaches get predictable leads with Meta ads. Can we do a 15-min call today or tomorrow?"}),
      ('Upsell to past buyers (DS)', 'whatsapp', 'ds', NULL,
       ${"Hi {first_name}, thanks for being a Digital Shahbaz learner! 🎉 We have a special offer for existing students on our next program. Want me to share the details?"}),
      ('Course details (email)', 'email', 'ds', 'Your next step with Digital Shahbaz',
       ${"Hi {first_name},\n\nThanks for your interest! Here are the details of the program we discussed.\n\nReply to this email with any questions.\n\n{my_name}"})`;
  }
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    await sql`CREATE INDEX IF NOT EXISTS leads_search_idx ON leads
      USING gin ((coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,'')) gin_trgm_ops)`;
  } catch {
    // trigram search index is optional
  }
}

const SCHEMA_VERSION = 3;

async function ensureSchema(sql: postgres.Sql) {
  await sql`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  const [row] = await sql<{ value: string }[]>`SELECT value FROM app_meta WHERE key = 'schema'`;
  if (row && Number(row.value) >= SCHEMA_VERSION) return;
  await createSchema(sql);
  await sql`INSERT INTO app_meta (key, value) VALUES ('schema', ${String(SCHEMA_VERSION)})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

/** Returns a ready-to-use client; runs migrations once per database (tracked in app_meta). */
export async function db() {
  const sql = client();
  if (!globalThis.__schemaReady) {
    globalThis.__schemaReady = ensureSchema(sql).catch((e) => {
      globalThis.__schemaReady = undefined;
      throw e;
    });
  }
  await globalThis.__schemaReady;
  return sql;
}
