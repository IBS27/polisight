-- Polisight Atomic Operations Migration
-- Creates stored procedures for transactional delete-and-insert operations
-- Prevents data loss if insert fails after delete

-- ============================================
-- Replace Argument Elements Atomically
-- ============================================
CREATE OR REPLACE FUNCTION replace_argument_elements(
  p_article_id UUID,
  p_elements JSONB
)
RETURNS SETOF argument_elements
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  elem JSONB;
  inserted_id UUID;
BEGIN
  -- Delete existing elements within transaction
  DELETE FROM argument_elements WHERE article_id = p_article_id;

  -- Insert new elements
  FOR elem IN SELECT * FROM jsonb_array_elements(p_elements)
  LOOP
    INSERT INTO argument_elements (
      article_id,
      element_type,
      content,
      claim_type,
      is_verifiable,
      is_explicit,
      criticality,
      timeframe,
      conditions,
      value_category,
      confidence,
      source_sentences
    ) VALUES (
      p_article_id,
      (elem->>'element_type')::VARCHAR(20),
      elem->>'content',
      (elem->>'claim_type')::VARCHAR(20),
      (elem->>'is_verifiable')::BOOLEAN,
      (elem->>'is_explicit')::BOOLEAN,
      (elem->>'criticality')::VARCHAR(20),
      elem->>'timeframe',
      elem->>'conditions',
      elem->>'value_category',
      (elem->>'confidence')::DECIMAL(3,2),
      COALESCE(elem->'source_sentences', '[]'::JSONB)
    )
    RETURNING id INTO inserted_id;

    RETURN QUERY SELECT * FROM argument_elements WHERE id = inserted_id;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================
-- Replace Context Cards Atomically
-- ============================================
CREATE OR REPLACE FUNCTION replace_context_cards(
  p_article_id UUID,
  p_cards JSONB
)
RETURNS SETOF context_cards
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  card JSONB;
  inserted_id UUID;
BEGIN
  -- Delete existing cards within transaction
  DELETE FROM context_cards WHERE article_id = p_article_id;

  -- Insert new cards
  FOR card IN SELECT * FROM jsonb_array_elements(p_cards)
  LOOP
    INSERT INTO context_cards (
      article_id,
      context_for,
      related_element_id,
      title,
      summary,
      key_facts,
      citations
    ) VALUES (
      p_article_id,
      (card->>'context_for')::VARCHAR(30),
      (card->>'related_element_id')::UUID,
      card->>'title',
      card->>'summary',
      COALESCE(card->'key_facts', '[]'::JSONB),
      COALESCE(card->'citations', '[]'::JSONB)
    )
    RETURNING id INTO inserted_id;

    RETURN QUERY SELECT * FROM context_cards WHERE id = inserted_id;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================
-- Replace Policy Parameters Atomically
-- ============================================
CREATE OR REPLACE FUNCTION replace_policy_parameters(
  p_article_id UUID,
  p_extraction_status VARCHAR(30),
  p_policy_type VARCHAR(50),
  p_parameters JSONB,
  p_calculation_formulas JSONB,
  p_reason TEXT,
  p_missing_information JSONB
)
RETURNS policy_parameters
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result policy_parameters;
BEGIN
  -- Delete existing parameters within transaction
  DELETE FROM policy_parameters WHERE article_id = p_article_id;

  -- Insert new parameters
  INSERT INTO policy_parameters (
    article_id,
    extraction_status,
    policy_type,
    parameters,
    calculation_formulas,
    reason,
    missing_information
  ) VALUES (
    p_article_id,
    p_extraction_status,
    p_policy_type,
    p_parameters,
    COALESCE(p_calculation_formulas, '[]'::JSONB),
    p_reason,
    COALESCE(p_missing_information, '[]'::JSONB)
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION replace_argument_elements(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_context_cards(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_policy_parameters(UUID, VARCHAR, VARCHAR, JSONB, JSONB, TEXT, JSONB) TO authenticated;
