-- Migration 014: Blank vote support
-- A blank ballot is a valid participation that does not vote for any candidate.
-- Blank votes count toward total participation (votes_current_round) but are
-- excluded from candidate percentages (denominator = non-blank ballots only).
-- Example: 4 voters, 2→X, 1→Z, 1 blank → X: 2/3 = 66.7%, Z: 1/3 = 33.3%

-- Allow NULL candidate_id so a blank ballot can insert one tracking row
ALTER TABLE public.votes ALTER COLUMN candidate_id DROP NOT NULL;

-- ============================================================
-- cast_ballot: handle empty p_candidate_ids as a blank vote
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_ballot(
  p_round_id       UUID,
  p_seat_id        UUID,
  p_candidate_ids  UUID[],
  p_device_hash    TEXT,
  p_user_agent     TEXT,
  p_round_number   INTEGER,
  p_vote_hash      TEXT,
  p_ip_address     TEXT DEFAULT 'browser-client'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_round              public.rounds%ROWTYPE;
  v_existing           INTEGER;
  v_candidate_id       UUID;
BEGIN
  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error_code', 'ROUND_NOT_FOUND');
  END IF;

  IF NOT v_round.is_voting_open THEN
    RETURN json_build_object('success', false, 'error_code', 'VOTING_CLOSED');
  END IF;

  -- Check device hasn't voted in this round+number already (includes blank rows)
  SELECT COUNT(*) INTO v_existing
  FROM public.votes
  WHERE round_id = p_round_id
    AND device_hash = p_device_hash
    AND round_number = p_round_number;

  IF v_existing > 0 THEN
    RETURN json_build_object('success', false, 'error_code', 'ALREADY_VOTED');
  END IF;

  IF array_length(p_candidate_ids, 1) IS NULL OR array_length(p_candidate_ids, 1) = 0 THEN
    -- Blank ballot: one tracking row with candidate_id = NULL
    INSERT INTO public.votes (
      round_id, candidate_id, seat_id,
      device_hash, user_agent, round_number,
      ip_address, vote_hash
    ) VALUES (
      p_round_id, NULL, p_seat_id,
      p_device_hash, p_user_agent, p_round_number,
      p_ip_address, p_vote_hash
    );
  ELSE
    FOREACH v_candidate_id IN ARRAY p_candidate_ids LOOP
      INSERT INTO public.votes (
        round_id, candidate_id, seat_id,
        device_hash, user_agent, round_number,
        ip_address, vote_hash
      ) VALUES (
        p_round_id, v_candidate_id, p_seat_id,
        p_device_hash, p_user_agent, p_round_number,
        p_ip_address, p_vote_hash
      );
    END LOOP;
  END IF;

  -- Count all devices including blank voters for participation counter
  UPDATE public.rounds
  SET votes_current_round = (
    SELECT COUNT(DISTINCT device_hash)
    FROM public.votes
    WHERE round_id = p_round_id
      AND round_number = p_round_number
  ),
  updated_at = now()
  WHERE id = p_round_id;

  RETURN json_build_object('success', true, 'vote_hash', p_vote_hash);
END;
$$;

-- ============================================================
-- calculate_round_results_with_majority: exclude blank votes
-- from candidate counts and use non-blank ballots as denominator
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_round_results_with_majority(
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
  -- Denominator = non-blank ballots only (candidate_id IS NOT NULL)
  SELECT COUNT(DISTINCT v.vote_hash)::INTEGER
  INTO v_total_ballots
  FROM public.votes v
  WHERE v.round_id = p_round_id
    AND v.round_number = p_round_number
    AND v.candidate_id IS NOT NULL
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
    AND v.candidate_id IS NOT NULL
    AND COALESCE(v.is_invalidated, false) = false
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cast_ballot(UUID, UUID, UUID[], TEXT, TEXT, INTEGER, TEXT, TEXT) IS
  'Atomic ballot submission. Empty p_candidate_ids inserts a blank-vote tracking row (candidate_id = NULL). Updates votes_current_round counting all devices including blank voters.';

COMMENT ON FUNCTION public.calculate_round_results_with_majority(UUID, INTEGER) IS
  'Returns per-candidate vote counts and percentages. Blank votes (candidate_id IS NULL) are excluded from counts and from the denominator, so percentages reflect share of non-blank ballots.';
