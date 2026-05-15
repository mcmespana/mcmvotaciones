-- ============================================================================
-- FIX: Percentage and majority based on submitted ballots
-- ----------------------------------------------------------------------------
-- Goal:
-- - Percentage/bar = vote_count / total_ballots_in_round.
-- - Majority (>50%) also evaluated over total ballots sent.
-- ============================================================================

ALTER TABLE public.round_results
ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;

DROP FUNCTION IF EXISTS public.process_round_results(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.calculate_round_results_with_majority(UUID, INTEGER);

CREATE FUNCTION public.calculate_round_results_with_majority(
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
  v_total_ballots INTEGER;
BEGIN
  SELECT COUNT(DISTINCT v.vote_hash)::INTEGER
  INTO v_total_ballots
  FROM public.votes v
  WHERE v.round_id = p_round_id
    AND v.round_number = p_round_number
    AND COALESCE(v.is_invalidated, false) = false;

  RETURN QUERY
  SELECT
    v.candidate_id,
    COUNT(v.id) AS vote_count,
    CASE
      WHEN v_total_ballots > 0 THEN (COUNT(v.id)::NUMERIC / v_total_ballots::NUMERIC) * 100
      ELSE 0
    END AS percentage,
    CASE
      WHEN v_total_ballots > 0 THEN (COUNT(v.id)::NUMERIC / v_total_ballots::NUMERIC) > 0.5
      ELSE false
    END AS has_absolute_majority
  FROM public.votes v
  WHERE v.round_id = p_round_id
    AND v.round_number = p_round_number
    AND COALESCE(v.is_invalidated, false) = false
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION public.process_round_results(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
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

  UPDATE public.rounds
  SET
    selected_candidates_count = (
      SELECT COUNT(*)
      FROM public.candidates
      WHERE round_id = p_round_id AND is_selected = true
    ),
    updated_at = NOW()
  WHERE id = p_round_id;

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

  SELECT json_build_object(
    'total_ballots', (
      SELECT COUNT(DISTINCT v.vote_hash)
      FROM public.votes v
      WHERE v.round_id = p_round_id
        AND v.round_number = p_round_number
        AND COALESCE(v.is_invalidated, false) = false
    ),
    'candidates_with_majority', (
      SELECT COUNT(*)
      FROM public.calculate_round_results_with_majority(p_round_id, p_round_number)
      WHERE has_absolute_majority = true
    ),
    'total_selected', (
      SELECT selected_candidates_count
      FROM public.rounds
      WHERE id = p_round_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Recompute stored percentages for already processed rounds
UPDATE public.round_results rr
SET percentage = CASE
  WHEN totals.total_ballots > 0 THEN (rr.vote_count::NUMERIC / totals.total_ballots::NUMERIC) * 100
  ELSE 0
END
FROM (
  SELECT v.round_id, v.round_number, COUNT(DISTINCT v.vote_hash)::INTEGER AS total_ballots
  FROM public.votes v
  WHERE COALESCE(v.is_invalidated, false) = false
  GROUP BY v.round_id, v.round_number
) totals
WHERE rr.round_id = totals.round_id
  AND rr.round_number = totals.round_number;
