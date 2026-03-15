ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

ALTER TABLE moderation_reports ADD COLUMN reviewed_by_user_id TEXT;
ALTER TABLE moderation_reports ADD COLUMN reviewed_at TEXT;
ALTER TABLE moderation_reports ADD COLUMN resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reviewed_by ON moderation_reports(reviewed_by_user_id, updated_at DESC);
