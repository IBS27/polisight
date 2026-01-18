-- PoliSight RLS Policies Migration
-- Adds Row Level Security to protect user data

-- ============================================
-- Add user_id column to user_profiles
-- Links profile to Supabase Auth user
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE omissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User Profiles Policies
-- Users can only access their own profile
-- ============================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile (with their user_id)
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Impact Calculations Policies
-- Users can only access calculations for their profile
-- ============================================

-- Policy: Users can view impact calculations for their profile
CREATE POLICY "Users can view own impact calculations"
  ON impact_calculations
  FOR SELECT
  USING (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create impact calculations for their profile
CREATE POLICY "Users can create own impact calculations"
  ON impact_calculations
  FOR INSERT
  WITH CHECK (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own impact calculations
CREATE POLICY "Users can delete own impact calculations"
  ON impact_calculations
  FOR DELETE
  USING (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Articles Policies
-- Articles are readable by all authenticated users
-- Only service role can create/modify
-- ============================================

-- Policy: Authenticated users can read articles
CREATE POLICY "Authenticated users can read articles"
  ON articles
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Related Tables Policies (read-only for users)
-- These are article-related and readable by authenticated users
-- ============================================

-- Sentence spans
CREATE POLICY "Authenticated users can read sentences"
  ON sentence_spans
  FOR SELECT
  TO authenticated
  USING (true);

-- Argument elements
CREATE POLICY "Authenticated users can read arguments"
  ON argument_elements
  FOR SELECT
  TO authenticated
  USING (true);

-- Omissions
CREATE POLICY "Authenticated users can read omissions"
  ON omissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Context cards
CREATE POLICY "Authenticated users can read context"
  ON context_cards
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy parameters
CREATE POLICY "Authenticated users can read policy params"
  ON policy_parameters
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Provenance Logs Policies
-- Users can view logs related to their profiles
-- ============================================

CREATE POLICY "Users can view related provenance logs"
  ON provenance_logs
  FOR SELECT
  USING (
    -- Can view logs for entities they own or articles they've viewed
    entity_type = 'article'
    OR (
      entity_type = 'user_profile'
      AND entity_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    )
    OR (
      entity_type = 'impact_calculation'
      AND entity_id IN (
        SELECT ic.id FROM impact_calculations ic
        JOIN user_profiles up ON ic.user_profile_id = up.id
        WHERE up.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Service Role Bypass
-- Note: service_role already bypasses RLS by default in Supabase
-- These explicit grants ensure API routes work correctly
-- ============================================

-- Grant service role full access to all tables
-- This is handled automatically by Supabase for service_role key
