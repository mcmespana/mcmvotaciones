-- Fix: confirm_round_selection must set is_active=false (not true) so closed
-- rounds don't appear as "sala activa" when opening a new voting session.
-- The projection finds closed rounds via show_results_to_voters / show_final_gallery_projection,
-- not via is_active, so this change is safe.

CREATE OR REPLACE FUNCTION public.confirm_round_selection(p_round_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_selected_count INT; v_max_selected INT;
BEGIN
  SELECT max_selected_candidates INTO v_max_selected FROM public.rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND'); END IF;
  SELECT COUNT(*) INTO v_selected_count FROM public.candidates WHERE round_id = p_round_id AND is_selected = true;
  IF v_selected_count < v_max_selected THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'QUOTA_NOT_MET',
      'selected_count', v_selected_count, 'required', v_max_selected);
  END IF;
  UPDATE public.rounds
    SET is_closed = true,
        is_active = false,
        is_voting_open = false,
        round_finalized = true,
        show_results_to_voters = true,
        show_ballot_summary_projection = false,
        show_final_gallery_projection = false,
        updated_at = NOW()
    WHERE id = p_round_id;
  RETURN jsonb_build_object('success', true, 'selected_count', v_selected_count);
END;
$$;

-- Also fix any rounds currently stuck in is_active=true AND is_closed=true
-- (rounds that were confirmed before this migration)
UPDATE public.rounds
  SET is_active = false, updated_at = NOW()
  WHERE is_closed = true AND is_active = true;
