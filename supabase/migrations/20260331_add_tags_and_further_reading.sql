ALTER TABLE paper_summaries
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS further_reading JSONB;
