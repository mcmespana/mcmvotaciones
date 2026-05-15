ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS show_final_gallery_projection BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION start_new_round(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  current_round_num INTEGER;
  selected_count INTEGER;
  remaining_count INTEGER;
  new_max_votes INTEGER;
  result JSON;
BEGIN
  -- Get current round number
  SELECT current_round_number INTO current_round_num
  FROM rounds
  WHERE id = p_round_id;

  -- Get count of selected candidates
  SELECT COUNT(*) INTO selected_count
  FROM candidates
  WHERE round_id = p_round_id AND is_selected = true;

  -- Get count of remaining candidates (not selected, not eliminated)
  SELECT COUNT(*) INTO remaining_count
  FROM candidates
  WHERE round_id = p_round_id
    AND is_selected = false
    AND is_eliminated = false;

  -- Calculate new max votes using the function
  SELECT calculate_max_votes(p_round_id) INTO new_max_votes;

  -- Increment round number, reset votes counter, update max votes, and reset both flags
  UPDATE rounds
  SET
    current_round_number = current_round_num + 1,
    votes_current_round = 0,
    max_votes_per_round = new_max_votes,
    round_finalized = false,
    show_results_to_voters = false,
    show_ballot_summary_projection = false,
    show_final_gallery_projection = false,
    updated_at = NOW()
  WHERE id = p_round_id;

  -- Build result JSON
  SELECT json_build_object(
    'success', true,
    'previous_round', current_round_num,
    'new_round', current_round_num + 1,
    'selected_count', selected_count,
    'remaining_count', remaining_count,
    'new_max_votes', new_max_votes
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
