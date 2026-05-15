-- ============================================================================
-- MIGRATION 010: Fix voting configuration handling
-- ----------------------------------------------------------------------------
-- Changes:
--   1. start_new_round: preserve admin-configured max_votes_per_round
--      (previously overwritten with auto-calculated value every round)
--   2. Admin can now set max_votes_per_round = 0 to use legacy auto logic
-- ============================================================================

-- Updated start_new_round: only auto-calculate if max_votes_per_round is 0 or NULL
CREATE OR REPLACE FUNCTION start_new_round(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  new_round_number INTEGER;
  current_max_votes INTEGER;
  new_max_votes INTEGER;
  result JSON;
BEGIN
  SELECT current_round_number + 1, COALESCE(max_votes_per_round, 0)
    INTO new_round_number, current_max_votes
  FROM public.rounds
  WHERE id = p_round_id;

  -- Only recalculate if admin has not set a specific per-round limit
  IF current_max_votes <= 0 THEN
    SELECT calculate_max_votes(p_round_id) INTO new_max_votes;
  ELSE
    new_max_votes := current_max_votes;
  END IF;

  UPDATE public.rounds
  SET
    current_round_number = new_round_number,
    max_votes_per_round = new_max_votes,
    votes_current_round = 0,
    updated_at = NOW()
  WHERE id = p_round_id;

  SELECT json_build_object(
    'round_number', new_round_number,
    'max_votes_per_round', new_max_votes,
    'selected_count', (SELECT selected_candidates_count FROM public.rounds WHERE id = p_round_id),
    'remaining_count', (SELECT max_selected_candidates - selected_candidates_count FROM public.rounds WHERE id = p_round_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
