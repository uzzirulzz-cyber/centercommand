CREATE TABLE IF NOT EXISTS pb_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS pb_sessions (
  sid text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at bigint NOT NULL,
  last_seen bigint NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pb_sessions_user_id_idx ON pb_sessions (user_id);
CREATE INDEX IF NOT EXISTS pb_sessions_expires_at_idx ON pb_sessions (expires_at);

CREATE TABLE IF NOT EXISTS pb_login_attempts (
  key text PRIMARY KEY,
  failures integer NOT NULL,
  locked_until bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS pb_records (
  app text NOT NULL,
  source_id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (app, source_id)
);

CREATE TABLE IF NOT EXISTS pb_sync_state (
  slug text PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS pb_admin_config (
  config_key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pb_audit (
  id text PRIMARY KEY,
  at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pb_audit_at_idx ON pb_audit (at DESC);
