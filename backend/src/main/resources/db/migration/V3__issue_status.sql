ALTER TABLE journal_issues ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED';

CREATE INDEX idx_journal_issues_status ON journal_issues (status);
