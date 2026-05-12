-- Problem 6 scoreboard — run once per database (Docker mounts this under
-- docker-entrypoint-initdb.d/, or run manually in psql / admin tool).
-- The Node app does not execute this file automatically.

CREATE TABLE IF NOT EXISTS scores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    VARCHAR(255) NOT NULL,
  score      BIGINT      NOT NULL DEFAULT 0,
  version    INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scores_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
