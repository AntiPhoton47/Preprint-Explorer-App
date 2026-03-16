CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  share_link_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_preprints (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  preprint_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (collection_id, preprint_id)
);

CREATE TABLE IF NOT EXISTS collection_collaborators (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection_id, email)
);

CREATE INDEX IF NOT EXISTS idx_collections_owner_updated ON collections(owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_collaborators_email ON collection_collaborators(email);
