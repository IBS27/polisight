-- User Articles Junction Table
-- Tracks which articles each user has viewed/analyzed

-- ============================================
-- Create user_articles table
-- ============================================
CREATE TABLE user_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each user-article pair is unique
  UNIQUE(user_id, article_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_user_articles_user ON user_articles(user_id);
CREATE INDEX idx_user_articles_article ON user_articles(article_id);
CREATE INDEX idx_user_articles_last_viewed ON user_articles(user_id, last_viewed_at DESC);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE user_articles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for user_articles
-- Users can only access their own article history
-- ============================================

-- Policy: Users can view their own article history
CREATE POLICY "Users can view own article history"
  ON user_articles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add articles to their history
CREATE POLICY "Users can add to own article history"
  ON user_articles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own article history (e.g., last_viewed_at)
CREATE POLICY "Users can update own article history"
  ON user_articles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete from their own article history
CREATE POLICY "Users can delete from own article history"
  ON user_articles
  FOR DELETE
  USING (auth.uid() = user_id);
