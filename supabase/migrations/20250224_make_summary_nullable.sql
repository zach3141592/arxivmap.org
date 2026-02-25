-- Allow papers to be saved without a summary (e.g. on first page visit)
ALTER TABLE paper_summaries ALTER COLUMN summary DROP NOT NULL;
