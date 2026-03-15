ALTER TABLE moderation_reports ADD COLUMN escalated_at TEXT;
ALTER TABLE moderation_reports ADD COLUMN escalation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_moderation_reports_escalated_at ON moderation_reports(escalated_at, updated_at DESC);
