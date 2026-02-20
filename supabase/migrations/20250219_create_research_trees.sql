CREATE TABLE research_trees (
  arxiv_id TEXT PRIMARY KEY,
  tree_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
