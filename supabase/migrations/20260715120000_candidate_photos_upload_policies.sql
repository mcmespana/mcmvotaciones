-- =============================================================================
-- Migration: candidate_photos_upload_policies
-- Author:    Claude
-- Date:      2026-07-15
-- Issue/PR:  N/A
-- Purpose:   Permitir subir fotos de candidatas desde el panel de admin
--            (drag & drop / adjuntar). El cliente usa la anon key, así que el
--            bucket candidate-photos necesita policies de INSERT/UPDATE/DELETE
--            además del SELECT público ya existente.
--
-- Rules:
--   * Idempotent: CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DO $$ EXCEPTION ...
--   * Transactional: BEGIN ... COMMIT (except DDL that disallows it).
--   * No data deletes without explicit user approval and explanation here.
--   * Apply via MCP `apply_migration` (auto-inserts version into schema_migrations).
--   * Never edit this file after it has been applied — write a new migration.
-- =============================================================================

BEGIN;

-- Bucket público de lectura (ya existe en prod; esto lo garantiza en entornos nuevos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "candidate_photos_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'candidate-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "candidate_photos_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'candidate-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "candidate_photos_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'candidate-photos')
    WITH CHECK (bucket_id = 'candidate-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "candidate_photos_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'candidate-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
