-- Daily token usage tracking per user
CREATE TABLE IF NOT EXISTS user_token_usage (
  user_id    UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE user_token_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage (e.g. to show a usage meter)
CREATE POLICY "Users can view own token usage"
  ON user_token_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic upsert+increment — called via service role from server code
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id UUID,
  p_date    DATE,
  p_tokens  INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_token_usage (user_id, date, tokens_used)
  VALUES (p_user_id, p_date, p_tokens)
  ON CONFLICT (user_id, date)
  DO UPDATE SET tokens_used = user_token_usage.tokens_used + EXCLUDED.tokens_used;
END;
$$;
