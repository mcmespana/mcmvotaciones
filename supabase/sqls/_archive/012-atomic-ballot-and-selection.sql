-- Migration 012: Atomic ballot submission and candidate selection RPCs
-- Addresses CRITICAL#2 and CRITICAL#3 from audit 2026-05-02

-- ============================================================
-- 1. cast_ballot: insert all votes for a ballot in one transaction
-- Returns { success, vote_hash, error_code }
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

  -- Check device hasn't voted in this round+number already
  SELECT COUNT(*) INTO v_existing
  FROM public.votes
  WHERE round_id = p_round_id
    AND device_hash = p_device_hash
    AND round_number = p_round_number;

  IF v_existing > 0 THEN
    RETURN json_build_object('success', false, 'error_code', 'ALREADY_VOTED');
  END IF;

  -- Insert one row per candidate (all in this transaction)
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

  -- Update counter from count(*) — avoids race with optimistic increments
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

COMMENT ON FUNCTION public.cast_ballot(UUID, UUID, UUID[], TEXT, TEXT, INTEGER, TEXT, TEXT) IS
  'Atomic ballot submission. Inserts all candidate votes in one transaction and updates votes_current_round. Returns ALREADY_VOTED if device already cast a ballot this round.';

-- ============================================================
-- 2. force_select_candidate: mark candidate selected and recount atomically
-- Returns { success, selected_count }
-- ============================================================

-- Drop any existing overloads with different signatures to avoid ambiguity
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'force_select_candidate'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.force_select_candidate(
  p_candidate_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate     public.candidates%ROWTYPE;
  v_round_number  INTEGER;
  v_count         INTEGER;
BEGIN
  SELECT * INTO v_candidate FROM public.candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error_code', 'CANDIDATE_NOT_FOUND');
  END IF;

  SELECT current_round_number INTO v_round_number
  FROM public.rounds WHERE id = v_candidate.round_id;

  UPDATE public.candidates
  SET is_selected       = true,
      selected_in_round = v_round_number,
      updated_at        = now()
  WHERE id = p_candidate_id;

  -- Recount from DB — no client-side drift possible
  UPDATE public.rounds
  SET selected_candidates_count = (
    SELECT COUNT(*) FROM public.candidates
    WHERE round_id = v_candidate.round_id AND is_selected = true
  ),
  updated_at = now()
  WHERE id = v_candidate.round_id;

  SELECT COUNT(*) INTO v_count
  FROM public.candidates
  WHERE round_id = v_candidate.round_id AND is_selected = true;

  RETURN json_build_object('success', true, 'selected_count', v_count);
END;
$$;

COMMENT ON FUNCTION public.force_select_candidate(UUID) IS
  'Mark a candidate as selected and atomically recount selected_candidates_count from DB. Used by both forceSelectCandidate and quickSelectCandidate in admin UI.';
