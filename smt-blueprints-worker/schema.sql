-- SMT Blueprints Marketplace schema (D1 / SQLite)
-- Last updated: 2026-02-08

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'unknown',
  auto_approve INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blueprints (
  blueprint_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  tags_csv TEXT NOT NULL DEFAULT '',
  complexity TEXT NOT NULL DEFAULT 'Intermediate',
  company_stage TEXT NOT NULL DEFAULT 'Growth',
  target_team_size TEXT NOT NULL DEFAULT '50-150',
  roadmap_horizon_years INTEGER NOT NULL DEFAULT 3,
  trust_label TEXT NOT NULL DEFAULT 'Community',
  source_type TEXT NOT NULL DEFAULT 'community',
  author_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  latest_version_id TEXT,
  latest_version_number INTEGER NOT NULL DEFAULT 0,
  stars_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blueprints_status_updated ON blueprints(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_blueprints_category ON blueprints(category);
CREATE INDEX IF NOT EXISTS idx_blueprints_trust ON blueprints(trust_label);
CREATE INDEX IF NOT EXISTS idx_blueprints_author ON blueprints(author_user_id);

CREATE TABLE IF NOT EXISTS blueprint_versions (
  version_id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  manifest_json TEXT NOT NULL,
  package_r2_key TEXT NOT NULL,
  package_size_bytes INTEGER NOT NULL DEFAULT 0,
  parent_blueprint_id TEXT,
  parent_version_id TEXT,
  teams_count INTEGER NOT NULL DEFAULT 0,
  services_count INTEGER NOT NULL DEFAULT 0,
  goals_count INTEGER NOT NULL DEFAULT 0,
  initiatives_count INTEGER NOT NULL DEFAULT 0,
  work_packages_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  published_by_user_id TEXT NOT NULL,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(blueprint_id),
  FOREIGN KEY (published_by_user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_unique_number ON blueprint_versions(blueprint_id, version_number);
CREATE INDEX IF NOT EXISTS idx_versions_blueprint_created ON blueprint_versions(blueprint_id, created_at);

-- Package blobs (D1 fallback when R2 is unavailable)
-- Stored as ordered chunks to avoid row-size limits.
CREATE TABLE IF NOT EXISTS blueprint_package_chunks (
  version_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  PRIMARY KEY (version_id, chunk_index),
  FOREIGN KEY (version_id) REFERENCES blueprint_versions(version_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_package_chunks_version ON blueprint_package_chunks(version_id);

CREATE TABLE IF NOT EXISTS blueprint_search_tokens (
  blueprint_id TEXT NOT NULL,
  token TEXT NOT NULL,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(blueprint_id)
);

CREATE INDEX IF NOT EXISTS idx_search_tokens_token ON blueprint_search_tokens(token);
CREATE INDEX IF NOT EXISTS idx_search_tokens_blueprint ON blueprint_search_tokens(blueprint_id);

CREATE TABLE IF NOT EXISTS stars (
  user_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blueprint_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(blueprint_id)
);

CREATE INDEX IF NOT EXISTS idx_stars_blueprint ON stars(blueprint_id);

CREATE TABLE IF NOT EXISTS comments (
  comment_id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL,
  version_id TEXT,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(blueprint_id),
  FOREIGN KEY (version_id) REFERENCES blueprint_versions(version_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_comments_blueprint_created ON comments(blueprint_id, created_at);
