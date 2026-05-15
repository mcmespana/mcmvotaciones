-- ============================================================================
-- MIGRATION 009: Recopilatorio improvements
-- ----------------------------------------------------------------------------
-- Changes:
--   1. candidates: add selected_in_round, selected_vote_count
--   2. rounds: add public_candidates_enabled
--   3. New table: round_participants (for per-round candidate subset)
--   4. Update process_round_results RPC to set selected_in_round + selected_vote_count
--   5. Update unselect_candidate RPC
--   6. Add get_public_round RPC
--   7. Trigger to enforce only one public round at a time
-- ============================================================================

-- 1. Candidates: track which round they were selected in and how many votes they got
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS selected_in_round INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_vote_count INTEGER DEFAULT NULL;

-- 2. Rounds: public candidate list toggle
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS public_candidates_enabled BOOLEAN DEFAULT false;

-- 3. round_participants: optional subset of candidates forced into a specific sub-round
--    Used when admin manually selects a subset to re-vote
CREATE TABLE IF NOT EXISTS public.round_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(round_id, round_number, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_round_participants ON public.round_participants(round_id, round_number);

-- 4. Update process_round_results to also set selected_in_round and selected_vote_count
DROP FUNCTION IF EXISTS public.process_round_results(UUID, INTEGER);

CREATE FUNCTION public.process_round_results(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Mark candidates with absolute majority as selected and record the round + votes
  UPDATE public.candidates c
  SET
    is_selected = true,
    selected_in_round = p_round_number,
    selected_vote_count = results.vote_count::INTEGER,
    updated_at = NOW()
  FROM (
    SELECT candidate_id, has_absolute_majority, vote_count
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

-- 5. unselect_candidate: clear selection and update counter
CREATE OR REPLACE FUNCTION public.unselect_candidate(p_candidate_id UUID)
RETURNS JSON AS $$
DECLARE
  v_round_id UUID;
  v_result JSON;
BEGIN
  SELECT round_id INTO v_round_id
  FROM public.candidates
  WHERE id = p_candidate_id;

  UPDATE public.candidates
  SET
    is_selected = false,
    selected_in_round = NULL,
    selected_vote_count = NULL,
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

  SELECT json_build_object('success', true, 'candidate_id', p_candidate_id) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: only one round can have public_candidates_enabled = true at a time
CREATE OR REPLACE FUNCTION public.enforce_single_public_round()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_candidates_enabled = true THEN
    UPDATE public.rounds
    SET public_candidates_enabled = false, updated_at = NOW()
    WHERE id <> NEW.id AND public_candidates_enabled = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_public_round ON public.rounds;
CREATE TRIGGER trg_single_public_round
  BEFORE INSERT OR UPDATE OF public_candidates_enabled ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_public_round();

-- 7. Backfill selected_in_round from existing round_results for already-selected candidates
-- (best-effort: picks the round_number where they first got the most votes as selected)
UPDATE public.candidates c
SET
  selected_in_round = rr.round_number,
  selected_vote_count = rr.vote_count
FROM public.round_results rr
WHERE c.id = rr.candidate_id
  AND c.is_selected = true
  AND c.selected_in_round IS NULL
  AND rr.vote_count = (
    SELECT MAX(rr2.vote_count)
    FROM public.round_results rr2
    WHERE rr2.candidate_id = c.id
  );
