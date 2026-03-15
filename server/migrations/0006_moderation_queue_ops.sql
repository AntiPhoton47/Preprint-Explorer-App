ALTER TABLE moderation_reports ADD COLUMN assigned_to_user_id TEXT;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(report_id) REFERENCES moderation_reports(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_assigned_to ON moderation_reports(assigned_to_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_created ON moderation_actions(report_id, created_at DESC);
