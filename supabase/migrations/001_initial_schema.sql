-- PoliSight Initial Database Schema
-- Stores user profiles, articles, argument analysis, and impact calculations

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- User Profiles
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Basic Demographics
  age INTEGER CHECK (age >= 0 AND age <= 150),
  state VARCHAR(2),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  household_size INTEGER CHECK (household_size >= 1),
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated')),

  -- Income & Employment
  employment_status VARCHAR(30) CHECK (employment_status IN ('employed_full_time', 'employed_part_time', 'self_employed', 'unemployed', 'retired', 'student', 'disabled')),
  individual_income DECIMAL(12, 2),
  household_income DECIMAL(12, 2),
  tax_filing_status VARCHAR(30) CHECK (tax_filing_status IN ('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow')),
  industry VARCHAR(100),

  -- Housing & Finances
  rent_vs_own VARCHAR(10) CHECK (rent_vs_own IN ('rent', 'own', 'other')),
  annual_housing_payment DECIMAL(12, 2),
  student_loan_balance DECIMAL(12, 2),
  other_debts DECIMAL(12, 2),

  -- Healthcare
  insurance_status VARCHAR(20) CHECK (insurance_status IN ('insured', 'uninsured', 'underinsured')),
  insurance_type VARCHAR(30) CHECK (insurance_type IN ('employer', 'marketplace', 'medicaid', 'medicare', 'va', 'tricare', 'private', 'none')),
  dependents_covered INTEGER DEFAULT 0,

  -- Education
  student_status VARCHAR(20) CHECK (student_status IN ('not_student', 'part_time', 'full_time')),
  institution_type VARCHAR(30) CHECK (institution_type IN ('public_2year', 'public_4year', 'private_nonprofit', 'private_forprofit', 'none')),
  in_state_vs_out_of_state VARCHAR(20) CHECK (in_state_vs_out_of_state IN ('in_state', 'out_of_state', 'not_applicable')),

  -- Current Benefits (JSONB for flexibility)
  current_benefits JSONB DEFAULT '{}'::JSONB
  -- Expected structure:
  -- {
  --   "snap": boolean,
  --   "medicaid": boolean,
  --   "medicare": boolean,
  --   "pell_grant": boolean,
  --   "child_tax_credit": boolean,
  --   "earned_income_tax_credit": boolean,
  --   "other_programs": string[]
  -- }
);

-- Index for common queries
CREATE INDEX idx_user_profiles_state ON user_profiles(state);

-- ============================================
-- Articles
-- ============================================
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  clean_text TEXT NOT NULL,
  author VARCHAR(255),
  publish_date TIMESTAMPTZ,
  site_name VARCHAR(255),

  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'extracted', 'analyzing', 'analyzed', 'error')),
  diffbot_response JSONB,
  error_message TEXT
);

-- Index for URL lookups
CREATE INDEX idx_articles_source_url ON articles(source_url);
CREATE INDEX idx_articles_status ON articles(status);

-- ============================================
-- Sentence Spans
-- ============================================
CREATE TABLE sentence_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

  sentence_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  paragraph_index INTEGER,

  UNIQUE(article_id, sentence_index)
);

-- Index for article sentence lookups
CREATE INDEX idx_sentence_spans_article ON sentence_spans(article_id, sentence_index);

-- ============================================
-- Argument Elements
-- ============================================
CREATE TABLE argument_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  element_type VARCHAR(20) NOT NULL CHECK (element_type IN ('claim', 'assumption', 'prediction', 'value')),
  content TEXT NOT NULL,

  -- For claims
  claim_type VARCHAR(20) CHECK (claim_type IN ('factual', 'causal', 'evaluative', 'policy')),
  is_verifiable BOOLEAN,

  -- For assumptions
  is_explicit BOOLEAN,
  criticality VARCHAR(20) CHECK (criticality IN ('low', 'medium', 'high', 'critical')),

  -- For predictions
  timeframe VARCHAR(50),
  conditions TEXT,

  -- For values
  value_category VARCHAR(50),

  -- Common fields
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  source_sentences JSONB NOT NULL DEFAULT '[]'::JSONB
  -- Expected structure: [{"sentenceIndex": 0, "relevance": "primary"}]
);

-- Indexes
CREATE INDEX idx_argument_elements_article ON argument_elements(article_id);
CREATE INDEX idx_argument_elements_type ON argument_elements(article_id, element_type);

-- ============================================
-- Omissions
-- ============================================
CREATE TABLE omissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  omission_type VARCHAR(30) NOT NULL CHECK (omission_type IN ('data_source', 'timeframe', 'stakeholder', 'cost', 'counterargument', 'implementation', 'historical_context', 'alternative')),
  detection_method VARCHAR(30) NOT NULL CHECK (detection_method IN ('deterministic', 'llm_detected', 'pattern_match')),

  description TEXT NOT NULL,
  why_it_matters TEXT,

  -- Optional: which sentences triggered detection
  related_sentences JSONB DEFAULT '[]'::JSONB
);

-- Index
CREATE INDEX idx_omissions_article ON omissions(article_id);

-- ============================================
-- Context Cards
-- ============================================
CREATE TABLE context_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- What this context is for
  context_for VARCHAR(30) NOT NULL CHECK (context_for IN ('claim', 'assumption', 'omission', 'general')),
  related_element_id UUID, -- Optional reference to argument_element or omission

  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  key_facts JSONB DEFAULT '[]'::JSONB,
  -- Expected structure: [{"fact": "text", "citationIndex": 0}]

  citations JSONB NOT NULL DEFAULT '[]'::JSONB
  -- Expected structure: [{"url": "...", "title": "...", "domain": "...", "snippet": "..."}]
);

-- Index
CREATE INDEX idx_context_cards_article ON context_cards(article_id);

-- ============================================
-- Policy Parameters
-- ============================================
CREATE TABLE policy_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  extraction_status VARCHAR(30) NOT NULL CHECK (extraction_status IN ('extracted', 'insufficient_detail', 'not_applicable')),

  -- When extracted
  policy_type VARCHAR(50) CHECK (policy_type IN ('tax_change', 'tax_credit', 'benefit_new', 'benefit_modification', 'benefit_elimination', 'subsidy', 'mandate', 'regulation', 'other')),
  parameters JSONB,
  -- Expected structure varies by policy_type, examples:
  -- Tax: {"effectiveDate": "...", "incomeBrackets": [...], "rateChanges": [...]}
  -- Benefit: {"eligibility": {...}, "benefitAmount": ..., "benefitFormula": "..."}

  calculation_formulas JSONB DEFAULT '[]'::JSONB,
  -- Expected structure: [{"formulaId": "...", "expression": "...", "description": "...", "requiredInputs": [...]}]

  -- When not extracted
  reason TEXT,
  missing_information JSONB DEFAULT '[]'::JSONB
);

-- Index
CREATE INDEX idx_policy_parameters_article ON policy_parameters(article_id);

-- ============================================
-- Impact Calculations
-- ============================================
CREATE TABLE impact_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  policy_parameter_id UUID NOT NULL REFERENCES policy_parameters(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

  calculation_status VARCHAR(30) NOT NULL CHECK (calculation_status IN ('computed', 'cannot_compute')),

  -- When computed
  primary_impact_value DECIMAL(15, 2),
  impact_unit VARCHAR(30) CHECK (impact_unit IN ('dollars_annual', 'dollars_monthly', 'dollars_one_time', 'percentage', 'qualitative')),
  impact_direction VARCHAR(20) CHECK (impact_direction IN ('positive', 'negative', 'neutral', 'mixed')),

  calculation_breakdown JSONB,
  -- Expected structure: {"steps": [...], "inputsUsed": {...}}

  caveats JSONB DEFAULT '[]'::JSONB,
  -- Expected structure: [{"type": "...", "description": "...", "severity": "..."}]

  -- When cannot compute
  reason TEXT,
  missing_inputs JSONB DEFAULT '[]'::JSONB
  -- Expected structure: [{"field": "...", "reason": "...", "impact": "..."}]
);

-- Indexes
CREATE INDEX idx_impact_calculations_user ON impact_calculations(user_profile_id);
CREATE INDEX idx_impact_calculations_article ON impact_calculations(article_id);
CREATE UNIQUE INDEX idx_impact_calculations_unique ON impact_calculations(user_profile_id, policy_parameter_id);

-- ============================================
-- Provenance Logs
-- ============================================
CREATE TABLE provenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,

  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'extracted', 'analyzed', 'validated', 'calculated', 'updated', 'error')),
  description TEXT NOT NULL,

  input_data JSONB,
  output_data JSONB,

  llm_model VARCHAR(100),
  llm_prompt TEXT,
  llm_response TEXT,

  duration_ms INTEGER,

  -- For tracking source of LLM calls
  api_provider VARCHAR(50) CHECK (api_provider IN ('openrouter', 'perplexity', 'diffbot'))
);

-- Indexes for provenance queries
CREATE INDEX idx_provenance_logs_entity ON provenance_logs(entity_type, entity_id);
CREATE INDEX idx_provenance_logs_article ON provenance_logs(article_id);
CREATE INDEX idx_provenance_logs_created ON provenance_logs(created_at DESC);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
