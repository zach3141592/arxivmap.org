-- Allow anyone (authenticated) to read starred papers from any user
CREATE POLICY "starred papers are public"
  ON paper_summaries FOR SELECT
  USING (starred = true);
