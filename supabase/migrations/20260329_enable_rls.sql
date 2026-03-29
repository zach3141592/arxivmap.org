-- Enable RLS on paper_summaries
ALTER TABLE paper_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON paper_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on paper_maps
ALTER TABLE paper_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON paper_maps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on research_trees (no user_id column — lock down entirely)
ALTER TABLE research_trees ENABLE ROW LEVEL SECURITY;
