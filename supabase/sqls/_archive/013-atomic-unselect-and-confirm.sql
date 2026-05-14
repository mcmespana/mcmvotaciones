-- ============================================================
-- 013 — Atomic unselect + confirm RPCs
-- Fixes CRITICAL #3 and #4 from AUDIT_2026-05-03:
--   reopen_round_after_unselect: atomic candidate unselect + round state recalc
--   confirm_round_selection:     validates quota before closing round
-- ============================================================

-- ── reopen_round_after_unselect ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reopen_round_after_unselect(
  p_candidate_id UUID,
  p_round_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_selected_count   INT;
  v_max_selected     INT;
  v_round_finalized  BOOL;
  v_is_closed        BOOL;
BEGIN
  -- Lock the round row to prevent concurrent races
  SELECT max_selected_candidates, round_finalized, is_closed
    INTO v_max_selected, v_round_finalized, v_is_closed
    FROM public.rounds
   WHERE id = p_round_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND');
  END IF;

  -- Unselect the candidate
  UPDATE public.candidates
     SET is_selected        = false,
         selected_in_round  = NULL,
         selected_vote_count = NULL,
         updated_at         = NOW()
   WHERE id = p_candidate_id
     AND round_id = p_round_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'CANDIDATE_NOT_FOUND');
  END IF;

  -- Recount after unselect
  SELECT COUNT(*) INTO v_selected_count
    FROM public.candidates
   WHERE round_id = p_round_id AND is_selected = true;

  -- If below quota and round was finalized/closed, reopen
  IF v_selected_count < v_max_selected THEN
    UPDATE public.rounds
       SET is_closed                      = false,
           is_active                      = true,
           round_finalized                = true,   -- keep finalized so results stay visible
           show_results_to_voters         = false,
           show_ballot_summary_projection = false,
           updated_at                     = NOW()
     WHERE id = p_round_id;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'selected_count', v_selected_count,
    'quota_reached',  v_selected_count >= v_max_selected
  );
END;
$$;

COMMENT ON FUNCTION public.reopen_round_after_unselect(UUID, UUID) IS
  'Atomically unselects a candidate and reopens the round if quota falls below max_selected_candidates.';

-- ── confirm_round_selection ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_round_selection(
  p_round_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_selected_count INT;
  v_max_selected   INT;
BEGIN
  SELECT max_selected_candidates INTO v_max_selected
    FROM public.rounds
   WHERE id = p_round_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND');
  END IF;

  SELECT COUNT(*) INTO v_selected_count
    FROM public.candidates
   WHERE round_id = p_round_id AND is_selected = true;

  IF v_selected_count < v_max_selected THEN
    RETURN jsonb_build_object(
      'success',        false,
      'error_code',     'QUOTA_NOT_MET',
      'selected_count', v_selected_count,
      'required',       v_max_selected
    );
  END IF;

  UPDATE public.rounds
     SET is_closed                      = true,
         is_active                      = true,
         is_voting_open                 = false,
         round_finalized                = true,
         show_results_to_voters         = true,
         show_ballot_summary_projection = false,
         show_final_gallery_projection  = false,
         updated_at                     = NOW()
   WHERE id = p_round_id;

  RETURN jsonb_build_object(
    'success',        true,
    'selected_count', v_selected_count
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_round_selection(UUID) IS
  'Closes a round only if selected candidate count >= max_selected_candidates. Prevents premature close.';
