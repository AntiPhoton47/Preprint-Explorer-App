CREATE TABLE IF NOT EXISTS content_sync_runs (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  query_text TEXT NOT NULL,
  status TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS ingested_preprints (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  categories_json TEXT NOT NULL,
  doi TEXT,
  abs_url TEXT,
  pdf_url TEXT,
  raw_json TEXT,
  sync_run_id TEXT,
  created_at TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  UNIQUE (source_name, external_id),
  FOREIGN KEY(sync_run_id) REFERENCES content_sync_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ingested_preprints_source_name ON ingested_preprints(source_name);
CREATE INDEX IF NOT EXISTS idx_ingested_preprints_published_at ON ingested_preprints(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_sync_runs_started_at ON content_sync_runs(started_at DESC);
