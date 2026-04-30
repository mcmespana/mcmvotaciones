-- ============================================================================
-- MIGRATION 012: Admin manual selection override
-- ----------------------------------------------------------------------------
-- Adds force_select_candidate RPC so admins can mark a candidate as selected
-- outside the normal majority workflow (e.g. between rounds, or to repair a
-- mistaken unselection). Mirrors the bookkeeping done by process_round_results.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.force_select_candidate(
  p_candidate_id UUID,
  p_round_number INTEGER DEFAULT NULL,
  p_vote_count   INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_round_id     UUID;
  v_round_number INTEGER;
  v_existing     BOOLEAN;
  v_result       JSON;
BEGIN
  SELECT round_id, COALESCE(is_selected, false)
    INTO v_round_id, v_existing
  FROM public.candidates
  WHERE id = p_candidate_id;

  IF v_round_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'CANDIDATE_NOT_FOUND',
      'message', 'Candidato no encontrado'
    );
  END IF;

  IF v_existing THEN
    RETURN json_build_object(
      'success', true,
      'already_selected', true,
      'candidate_id', p_candidate_id
    );
  END IF;

  v_round_number := COALESCE(
    p_round_number,
    (SELECT current_round_number FROM public.rounds WHERE id = v_round_id),
    1
  );

  UPDATE public.candidates
  SET
    is_selected = true,
    is_eliminated = false,
    selected_in_round = v_round_number,
    selected_vote_count = p_vote_count,
    updated_at = NOW()
  WHERE id = p_candidate_id;

  UPDATE public.rounds
  SET
    selected_candidates_count = (
      SELECT COUNT(*)
      FROM public.candidates
      WHERE round_id = v_round_id AND is_selected = true
    ),
    updated_at = NOW()
  WHERE id = v_round_id;

  SELECT json_build_object(
    'success', true,
    'candidate_id', p_candidate_id,
    'round_number', v_round_number,
    'selected_total', (SELECT selected_candidates_count FROM public.rounds WHERE id = v_round_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.force_select_candidate IS
  'Admin override: mark a candidate as selected outside the majority workflow. Updates selected_candidates_count.';
