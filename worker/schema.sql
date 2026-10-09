-- FamilyOS D1 (Cloudflare) şeması
-- Kurulum: npx wrangler d1 execute familyos --remote --file=./worker/schema.sql

CREATE TABLE IF NOT EXISTS family_state (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,          -- { db: DB, ops: Op[], rev: number }
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint     TEXT PRIMARY KEY,
  subscription TEXT NOT NULL,        -- PushSubscription JSON
  created_at   INTEGER NOT NULL
);

-- Opsiyonel: op geçmişi (denetim/geri alma için)
CREATE TABLE IF NOT EXISTS op_log (
  id      TEXT PRIMARY KEY,
  entity  TEXT NOT NULL,
  action  TEXT NOT NULL,
  origin  TEXT,
  ts      INTEGER NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_op_log_ts ON op_log (ts);
CREATE INDEX IF NOT EXISTS idx_push_subs_created ON push_subs (created_at);

/* ---------------- İsteğe bağlı ilişkisel şema (ileriye dönük) ----------------
   Aşağıdaki tablolar, op-log mimarisine ek olarak analiz/raporlama
   gerektiren senaryolar için hazır referanslardır.

CREATE TABLE IF NOT EXISTS members (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '🙂',
  role       TEXT NOT NULL CHECK (role IN ('parent','child')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  start_at   TEXT NOT NULL,
  end_at     TEXT,
  all_day    INTEGER NOT NULL DEFAULT 0,
  location   TEXT,
  notes      TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_members (
  event_id  TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, member_id)
);

CREATE TABLE IF NOT EXISTS chores (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  assignee_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  repeat      TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none','daily','weekly','monthly')),
  start_date  TEXT NOT NULL,
  due_date    TEXT,
  done_on     TEXT,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Diğer',
  qty         TEXT,
  done        INTEGER NOT NULL DEFAULT 0,
  added_by_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  slot       TEXT NOT NULL CHECK (slot IN ('breakfast','lunch','dinner')),
  title      TEXT NOT NULL,
  note       TEXT,
  updated_at INTEGER NOT NULL,
  UNIQUE (date, slot)
);

CREATE TABLE IF NOT EXISTS words (
  id               TEXT PRIMARY KEY,
  term             TEXT NOT NULL,
  meaning          TEXT NOT NULL,
  example          TEXT,
  deck             TEXT NOT NULL DEFAULT 'Genel',
  state            TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','review')),
  ease             REAL NOT NULL DEFAULT 2.5,
  interval_min     INTEGER NOT NULL DEFAULT 0,
  reps             INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  due_at           INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  updated_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_words_due ON words (due_at);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  options     TEXT NOT NULL,          -- JSON array
  correct     INTEGER NOT NULL,
  explanation TEXT,
  category    TEXT,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  correct     INTEGER NOT NULL,
  at          INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  target     TEXT NOT NULL DEFAULT 'wall',  -- 'wall' | member_id
  text       TEXT NOT NULL,
  at         INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id            TEXT PRIMARY KEY DEFAULT 'main',
  family_name   TEXT NOT NULL DEFAULT 'Ailem',
  mode          TEXT NOT NULL DEFAULT 'auto',
  idle_minutes  INTEGER NOT NULL DEFAULT 3,
  city          TEXT,
  lat           REAL,
  lon           REAL,
  weather_enabled INTEGER NOT NULL DEFAULT 1,
  sound_enabled   INTEGER NOT NULL DEFAULT 1,
  updated_at    INTEGER NOT NULL
);
*/
