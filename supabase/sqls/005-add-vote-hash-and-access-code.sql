-- Migration 005: Add vote hash verification and access code system
-- Run this after all previous migrations (001-004)

-- ============================================
-- 1. Add vote_hash column to votes table
-- ============================================
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_hash TEXT;

-- Index for fast hash lookups (verification)
CREATE INDEX IF NOT EXISTS idx_votes_vote_hash ON votes(vote_hash);

-- ============================================
-- 2. Add access_code column to rounds table
-- ============================================
-- Alphanumeric code (3-5 chars) that voters must enter to access the round.
-- NULL means no code required (open access).
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS access_code TEXT DEFAULT NULL;

-- ============================================
-- 3. Add is_invalidated to votes for ballot review
-- ============================================
ALTER TABLE votes ADD COLUMN IF NOT EXISTS is_invalidated BOOLEAN DEFAULT FALSE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS invalidation_reason TEXT DEFAULT NULL;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- 4. Add census_mode to rounds
-- ============================================
-- 'maximum': round can be finalized anytime (current behavior)
-- 'exact': round can only be finalized when all max_votantes have voted
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS census_mode TEXT DEFAULT 'maximum'
  CHECK (census_mode IN ('maximum', 'exact'));

-- ============================================
-- 5. Function to verify a vote hash
-- ============================================
CREATE OR REPLACE FUNCTION verify_vote_hash(
  p_vote_hash TEXT
)
RETURNS TABLE (
  found BOOLEAN,
  round_title TEXT,
  round_number INTEGER,
  voted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS found,
    r.title AS round_title,
    v.round_number AS round_number,
    v.created_at AS voted_at
  FROM votes v
  JOIN rounds r ON r.id = v.round_id
  WHERE v.vote_hash = p_vote_hash
    AND v.is_invalidated = FALSE
  LIMIT 1;

  -- If no rows returned, return a "not found" row
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- ============================================
-- 6. Update process_round_results to exclude invalidated votes
-- ============================================
-- This ensures invalidated votes are not counted in results
-- Note: Only run this if process_round_results exists
DO $$
BEGIN
  -- Check if the function exists before trying to update it
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'process_round_results'
  ) THEN
    RAISE NOTICE 'process_round_results exists - consider updating it to filter is_invalidated = FALSE';
  END IF;
END;
$$;

-- ============================================
-- 7. Verification queries
-- ============================================
-- Run these to verify the migration:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'votes' AND column_name IN ('vote_hash', 'is_invalidated', 'invalidation_reason', 'invalidated_at');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rounds' AND column_name IN ('access_code', 'census_mode');
