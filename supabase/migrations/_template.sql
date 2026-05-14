-- =============================================================================
-- Migration: <DESCRIPTIVE_NAME>
-- Author:    <YOUR_NAME>
-- Date:      <YYYY-MM-DD>
-- Issue/PR:  <#NN or N/A>
-- Purpose:   <one-line description of WHY this change is needed>
--
-- Rules:
--   * Idempotent: CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DO $$ EXCEPTION ...
--   * Transactional: BEGIN ... COMMIT (except DDL that disallows it).
--   * No data deletes without explicit user approval and explanation here.
--   * Apply via MCP `apply_migration` (auto-inserts version into schema_migrations).
--   * Never edit this file after it has been applied — write a new migration.
-- =============================================================================

BEGIN;

-- Example: add a nullable column
-- ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS new_field text;

-- Example: create or replace function
-- CREATE OR REPLACE FUNCTION public.my_helper() RETURNS integer
-- LANGUAGE sql IMMUTABLE AS $$ SELECT 42; $$;

-- Example: create index
-- CREATE INDEX IF NOT EXISTS idx_my_table_col ON public.my_table(col);

-- Example: idempotent policy
-- DO $$ BEGIN
--   CREATE POLICY "my_policy" ON public.my_table FOR SELECT USING (true);
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
