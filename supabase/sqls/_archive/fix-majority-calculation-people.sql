-- ============================================================================
-- Majority based on UNIQUE VOTERS (people), not expected votes
-- ----------------------------------------------------------------------------
-- This script provides a clearer, dedicated implementation where
-- the absolute majority and percentage are computed over the number
-- of unique voters who actually voted in the round (people), i.e.:
--   COUNT(DISTINCT device_hash) for (round_id, round_number)
--
-- Examples:
--   - 3 people vote and a candidate gets 3 votes -> 3/3 = 100% > 50%
--   - 3 people vote and a candidate gets 2 votes -> 2/3 = 66.7% > 50%
-- ============================================================================

-- 0) Keep percentage column available in round_results
ALTER TABLE public.round_results 
ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;

-- 1) Calculate results using unique voters as denominator
CREATE OR REPLACE FUNCTION calculate_round_results_with_majority(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS TABLE (
  candidate_id UUID,
  vote_count BIGINT,
  percentage NUMERIC,
  has_absolute_majority BOOLEAN
) AS $$
DECLARE
  total_voters INTEGER; -- unique voters (people) who voted in the round
BEGIN
  -- Get total unique voters for this round (people)
  SELECT get_unique_voters_count(p_round_id, p_round_number) INTO total_voters;

  RETURN QUERY
  SELECT 
    v.candidate_id,
    COUNT(v.id) AS vote_count,
    CASE 
      WHEN total_voters > 0 THEN (COUNT(v.id)::NUMERIC / total_voters::NUMERIC * 100)
      ELSE 0
    END AS percentage,
    CASE 
      -- Absolute majority: more than 50% of the PEOPLE who voted
      WHEN total_voters > 0 THEN (COUNT(v.id)::NUMERIC / total_voters::NUMERIC) > 0.5
      ELSE false
    END AS has_absolute_majority
  FROM public.votes v
  WHERE v.round_id = p_round_id 
    AND v.round_number = p_round_number
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 2) Process round results and persist into round_results including percentage
CREATE OR REPLACE FUNCTION process_round_results(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Mark candidates with absolute majority as selected
  UPDATE public.candidates c
  SET 
    is_selected = true,
    updated_at = NOW()
  FROM (
    SELECT candidate_id, has_absolute_majority
    FROM calculate_round_results_with_majority(p_round_id, p_round_number)
    WHERE has_absolute_majority = true
  ) results
  WHERE c.id = results.candidate_id
    AND c.round_id = p_round_id
    AND c.is_selected = false
    AND c.is_eliminated = false;
  
  -- Update selected candidates counter
  UPDATE public.rounds
  SET 
    selected_candidates_count = (
      SELECT COUNT(*) 
      FROM public.candidates 
      WHERE round_id = p_round_id AND is_selected = true
    ),
    updated_at = NOW()
  WHERE id = p_round_id;
  
  -- Upsert results with percentage
  INSERT INTO public.round_results (round_id, round_number, candidate_id, vote_count, percentage, is_visible)
  SELECT 
    p_round_id,
    p_round_number,
    candidate_id,
    vote_count::INTEGER,
    percentage,
    false
  FROM calculate_round_results_with_majority(p_round_id, p_round_number)
  ON CONFLICT (round_id, round_number, candidate_id) 
  DO UPDATE SET 
    vote_count = EXCLUDED.vote_count,
    percentage = EXCLUDED.percentage,
    is_visible = EXCLUDED.is_visible;
  
  -- Return summary
  SELECT json_build_object(
    'total_voters', get_unique_voters_count(p_round_id, p_round_number),
    'candidates_with_majority', (
      SELECT COUNT(*) 
      FROM calculate_round_results_with_majority(p_round_id, p_round_number) 
      WHERE has_absolute_majority = true
    ),
    'total_selected', (
      SELECT selected_candidates_count 
      FROM public.rounds 
      WHERE id = p_round_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- NOTE:
-- - This script intentionally REPLACES process_round_results and the helper
--   calculate_round_results_with_majority with a people-based calculation.
-- - Apply this file after any previous majority-related scripts to ensure this
--   version is the one active in your database.
