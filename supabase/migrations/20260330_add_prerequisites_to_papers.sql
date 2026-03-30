ALTER TABLE paper_summaries
  ADD COLUMN IF NOT EXISTS prerequisites JSONB;
