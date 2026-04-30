-- ============================================================================
-- MIGRATION 013: start_new_round full transition
-- ----------------------------------------------------------------------------
-- Consolidates the frontend "manual UPDATE after RPC" hop into the RPC itself.
-- start_new_round now atomically:
--   * preserves admin-configured max_votes_per_round (fallback to auto only
--     when 0/NULL — keeps the 010 behaviour),
--   * increments current_round_number, clears votes_current_round,
--   * resets the projection / review flags (round_finalized,
--     show_results_to_voters, show_ballot_summary_projection,
--     show_final_gallery_projection),
--   * forces is_active=true, is_voting_open=true, join_locked=true so the new
--     round opens immediately for the existing seats (papeleta fija requirement).
-- Seats are intentionally NOT touched (P0 #1 — papeleta fija por dispositivo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_new_round(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  new_round_number INTEGER;
  current_max_votes INTEGER;
  new_max_votes INTEGER;
  v_selected INTEGER;
  v_max_selected INTEGER;
  result JSON;
BEGIN
  SELECT current_round_number + 1,
         COALESCE(max_votes_per_round, 0),
         COALESCE(selected_candidates_count, 0),
         max_selected_candidates
    INTO new_round_number, current_max_votes, v_selected, v_max_selected
  FROM public.rounds
  WHERE id = p_round_id;

  IF new_round_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  END IF;

  IF v_selected >= v_max_selected THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'QUOTA_REACHED',
      'message', 'La selección ya ha alcanzado el cupo configurado'
    );
  END IF;

  IF current_max_votes <= 0 THEN
    SELECT calculate_max_votes(p_round_id) INTO new_max_votes;
  ELSE
    new_max_votes := current_max_votes;
  END IF;

  UPDATE public.rounds
  SET
    current_round_number = new_round_number,
    max_votes_per_round  = new_max_votes,
    votes_current_round  = 0,
    is_active            = true,
    is_voting_open       = true,
    join_locked          = true,
    round_finalized      = false,
    show_results_to_voters         = false,
    show_ballot_summary_projection = false,
    show_final_gallery_projection  = false,
    updated_at = NOW()
  WHERE id = p_round_id;

  SELECT json_build_object(
    'success', true,
    'round_number', new_round_number,
    'max_votes_per_round', new_max_votes,
    'selected_count', v_selected,
    'remaining_count', GREATEST(v_max_selected - v_selected, 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
