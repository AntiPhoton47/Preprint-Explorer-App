ALTER TABLE user_settings ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE user_settings ADD COLUMN message_privacy TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE user_settings ADD COLUMN share_privacy TEXT NOT NULL DEFAULT 'everyone';

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  action_url TEXT,
  actor_user_id TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
