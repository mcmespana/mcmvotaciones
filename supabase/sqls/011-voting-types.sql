-- ============================================================================
-- MIGRATION 011: Voting types system
-- ----------------------------------------------------------------------------
-- Creates voting_types table for ECE/ECL system defaults + custom named types.
-- Rounds get a voting_type_id FK (nullable) and voting_type_name snapshot.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.voting_types (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                   TEXT NOT NULL UNIQUE,
  max_selected_candidates INTEGER NOT NULL DEFAULT 1,
  max_votes_per_round    INTEGER NOT NULL DEFAULT 0,
  census_mode            TEXT NOT NULL DEFAULT 'maximum'
                           CHECK (census_mode IN ('maximum', 'exact')),
  is_system              BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- System defaults (editable by super_admin, not deletable)
INSERT INTO public.voting_types (name, max_selected_candidates, max_votes_per_round, census_mode, is_system)
VALUES
  ('ECE', 1, 0, 'maximum', true),
  ('ECL', 1, 0, 'maximum', true)
ON CONFLICT (name) DO NOTHING;

-- Add columns to rounds
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS voting_type_id   UUID REFERENCES public.voting_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voting_type_name TEXT;
