CREATE TABLE IF NOT EXISTS canonical_papers (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  doi_normalized TEXT,
  title_normalized TEXT NOT NULL,
  primary_title TEXT NOT NULL,
  authors_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  categories_json TEXT NOT NULL,
  primary_source_name TEXT NOT NULL,
  abs_url TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canonical_papers_published_at ON canonical_papers(published_at DESC);

ALTER TABLE ingested_preprints ADD COLUMN canonical_paper_id TEXT REFERENCES canonical_papers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ingested_preprints_canonical ON ingested_preprints(canonical_paper_id);

CREATE TABLE IF NOT EXISTS source_sync_definitions (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  query_text TEXT NOT NULL,
  max_results INTEGER NOT NULL,
  interval_minutes INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  last_status TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_sync_definitions_due ON source_sync_definitions(enabled, next_run_at);
