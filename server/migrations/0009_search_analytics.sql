CREATE TABLE IF NOT EXISTS search_analytics (
  normalized_query TEXT PRIMARY KEY,
  display_query TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  last_user_id TEXT,
  last_searched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_count ON search_analytics(search_count DESC, last_searched_at DESC);
