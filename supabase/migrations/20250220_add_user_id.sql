-- Add user_id to paper_summaries
ALTER TABLE paper_summaries
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old primary key and create composite
ALTER TABLE paper_summaries
  DROP CONSTRAINT IF EXISTS paper_summaries_pkey;
ALTER TABLE paper_summaries
  ADD PRIMARY KEY (arxiv_id, user_id);

CREATE INDEX IF NOT EXISTS idx_paper_summaries_user ON paper_summaries(user_id);

-- Add user_id to research_trees
ALTER TABLE research_trees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE research_trees
  DROP CONSTRAINT IF EXISTS research_trees_pkey;
ALTER TABLE research_trees
  ADD PRIMARY KEY (arxiv_id, user_id);

CREATE INDEX IF NOT EXISTS idx_research_trees_user ON research_trees(user_id);

-- Update junction table FK to match new composite key
-- Drop old FK and recreate
ALTER TABLE research_tree_papers
  DROP CONSTRAINT IF EXISTS research_tree_papers_tree_arxiv_id_fkey;

ALTER TABLE research_tree_papers
  ADD COLUMN IF NOT EXISTS tree_user_id UUID;

ALTER TABLE research_tree_papers
  DROP CONSTRAINT IF EXISTS research_tree_papers_pkey;
ALTER TABLE research_tree_papers
  ADD PRIMARY KEY (tree_arxiv_id, tree_user_id, paper_arxiv_id);

CREATE INDEX IF NOT EXISTS idx_rtp_user ON research_tree_papers(tree_user_id);
