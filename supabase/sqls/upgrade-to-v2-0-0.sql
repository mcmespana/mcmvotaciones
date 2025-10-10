-- ============================================================================
-- UPGRADE SCRIPT: Sistema de votaciones MCM → versión 2.0.0
-- Ejecutar en el editor SQL de Supabase.
--
-- Este script combina las migraciones:
--   001-rename-expected-voters-to-max-votantes.sql
--   002-create-seats-table.sql
--   003-update-majority-to-fixed-threshold.sql
--   004-seats-management-api.sql
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 001 - Renombrar expected_voters a max_votantes
-- --------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE 'Ejecutando migración 001…';
END $$;

-- ============================================================================
-- MIGRACIÓN: Renombrar expected_voters a max_votantes
-- ============================================================================
-- Este cambio refleja que max_votantes define el CUPO FIJO de votantes
-- habilitados para cada ronda, NO una expectativa estimada.
--
-- El umbral de selección se calcula sobre este valor:
--   umbral = CEIL(0.5 * max_votantes)
-- ============================================================================

-- 1. Renombrar la columna en la tabla rounds
ALTER TABLE public.rounds
RENAME COLUMN expected_voters TO max_votantes;

-- 2. Actualizar comentario de la columna
COMMENT ON COLUMN public.rounds.max_votantes IS
  'Número máximo de votantes (cupos) habilitados para esta ronda. Define el umbral de selección: ceil(0.5 * max_votantes)';

-- 3. Verificar el cambio
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rounds'
      AND column_name = 'max_votantes'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✅ Columna max_votantes creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: la columna max_votantes no existe';
  END IF;
END $$;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- - expected_voters → max_votantes (sin cambio de tipo ni constraints)
-- - Todas las funciones SQL que referencien expected_voters deberán actualizarse
-- ============================================================================

-- --------------------------------------------------------------------------
-- 002 - Crear tabla de asientos (seats)
-- --------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE 'Ejecutando migración 002…';
END $$;

-- ============================================================================
-- MIGRACIÓN: Crear sistema de asientos (seats)
-- ============================================================================
-- Crea tabla de asientos y utilidades para controlar cupos fijos de votantes.
-- ============================================================================

-- 1. Crear enum para estados de asiento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'seat_status'
  ) THEN
    CREATE TYPE seat_status AS ENUM ('libre', 'ocupado', 'expirado');
  END IF;
END $$;

-- 2. Crear tabla seats
CREATE TABLE IF NOT EXISTS public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  browser_instance_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado seat_status NOT NULL DEFAULT 'ocupado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, fingerprint_hash),
  UNIQUE(round_id, browser_instance_id)
);

-- 3. Añadir columna seat_id a votes si no existe
ALTER TABLE public.votes
ADD COLUMN IF NOT EXISTS seat_id UUID REFERENCES public.seats(id);

-- 4. Índices adicionales
CREATE INDEX IF NOT EXISTS seats_round_id_idx ON public.seats(round_id);
CREATE INDEX IF NOT EXISTS seats_fingerprint_idx ON public.seats(fingerprint_hash);
CREATE INDEX IF NOT EXISTS seats_browser_idx ON public.seats(browser_instance_id);
CREATE INDEX IF NOT EXISTS votes_round_number_idx ON public.votes(round_number);
CREATE INDEX IF NOT EXISTS votes_round_id_idx ON public.votes(round_id);

-- 5. Funciones helper
CREATE OR REPLACE FUNCTION public.count_occupied_seats(p_round_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  occupied_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO occupied_count
  FROM public.seats
  WHERE round_id = p_round_id
    AND estado = 'ocupado';

  RETURN occupied_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_max_votantes(p_round_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_votantes INTEGER;
BEGIN
  SELECT r.max_votantes INTO max_votantes
  FROM public.rounds r
  WHERE r.id = p_round_id;

  RETURN COALESCE(max_votantes, 0);
END;
$$;

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_seats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_seats_updated_at ON public.seats;
CREATE TRIGGER trg_update_seats_updated_at
BEFORE UPDATE ON public.seats
FOR EACH ROW
EXECUTE FUNCTION public.update_seats_updated_at();

-- --------------------------------------------------------------------------
-- 003 - Actualizar lógica de mayoría a umbral fijo
-- --------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE 'Ejecutando migración 003…';
END $$;

-- ============================================================================
-- MIGRACIÓN: Actualizar lógica de mayoría
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_selection_threshold(max_votantes INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF max_votantes IS NULL OR max_votantes <= 0 THEN
    RETURN 0;
  END IF;

  RETURN CEIL(max_votantes * 0.5);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_round_results_with_majority(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_round RECORD;
  v_candidate RECORD;
  v_threshold INTEGER;
BEGIN
  SELECT *, calculate_selection_threshold(max_votantes) AS selection_threshold
  INTO v_round
  FROM public.rounds
  WHERE id = p_round_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ronda % no encontrada', p_round_id;
  END IF;

  v_threshold := v_round.selection_threshold;

  FOR v_candidate IN
    SELECT c.id, c.round_id, COUNT(v.id) AS vote_count
    FROM public.candidates c
    LEFT JOIN public.votes v ON v.candidate_id = c.id AND v.round_number = v_round.current_round_number
    WHERE c.round_id = p_round_id
    GROUP BY c.id, c.round_id
  LOOP
    UPDATE public.candidates
    SET
      is_selected = v_candidate.vote_count >= v_threshold,
      updated_at = NOW()
    WHERE id = v_candidate.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_round_results(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_round RECORD;
  v_results RECORD;
  v_threshold INTEGER;
BEGIN
  SELECT *, calculate_selection_threshold(max_votantes) AS selection_threshold
  INTO v_round
  FROM public.rounds
  WHERE id = p_round_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ronda % no encontrada', p_round_id;
  END IF;

  v_threshold := v_round.selection_threshold;

  DELETE FROM public.round_results
  WHERE round_id = p_round_id AND round_number = v_round.current_round_number;

  FOR v_results IN
    SELECT
      c.id AS candidate_id,
      COUNT(v.id) AS vote_count,
      CASE
        WHEN v_round.max_votantes > 0 THEN ROUND((COUNT(v.id)::NUMERIC / v_round.max_votantes) * 100, 2)
        ELSE 0
      END AS percentage
    FROM public.candidates c
    LEFT JOIN public.votes v ON v.candidate_id = c.id AND v.round_number = v_round.current_round_number
    WHERE c.round_id = p_round_id
    GROUP BY c.id
  LOOP
    INSERT INTO public.round_results (
      round_id,
      round_number,
      candidate_id,
      vote_count,
      percentage,
      created_at,
      is_visible
    ) VALUES (
      p_round_id,
      v_round.current_round_number,
      v_results.candidate_id,
      v_results.vote_count,
      v_results.percentage,
      NOW(),
      v_round.show_results_to_voters
    );
  END LOOP;

  UPDATE public.candidates
  SET
    is_selected = vote_count >= v_threshold,
    updated_at = NOW()
  FROM (
    SELECT
      c.id AS candidate_id,
      COUNT(v.id) AS vote_count
    FROM public.candidates c
    LEFT JOIN public.votes v ON v.candidate_id = c.id AND v.round_number = v_round.current_round_number
    WHERE c.round_id = p_round_id
    GROUP BY c.id
  ) AS stats
  WHERE candidates.id = stats.candidate_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 004 - API de gestión de asientos
-- --------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE 'Ejecutando migración 004…';
END $$;

-- ============================================================================
-- MIGRACIÓN: API seats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_round_seat(
  p_round_id UUID,
  p_fingerprint_hash TEXT,
  p_browser_instance_id TEXT,
  p_user_agent TEXT,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_round RECORD;
  v_existing_seat RECORD;
  v_max_votantes INTEGER;
  v_occupied INTEGER;
  v_is_new BOOLEAN := FALSE;
BEGIN
  SELECT *, calculate_selection_threshold(max_votantes) AS selection_threshold
  INTO v_round
  FROM public.rounds
  WHERE id = p_round_id;

  IF NOT FOUND OR NOT v_round.is_active THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda no está activa o no existe'
    );
  END IF;

  v_max_votantes := get_max_votantes(p_round_id);
  v_occupied := count_occupied_seats(p_round_id);

  IF v_max_votantes > 0 AND v_occupied >= v_max_votantes THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error_code', 'ROUND_FULL',
      'occupied_seats', v_occupied,
      'max_votantes', v_max_votantes,
      'message', 'No hay asientos disponibles'
    );
  END IF;

  SELECT *
  INTO v_existing_seat
  FROM public.seats
  WHERE round_id = p_round_id
    AND (fingerprint_hash = p_fingerprint_hash OR browser_instance_id = p_browser_instance_id)
  ORDER BY joined_at DESC
  LIMIT 1;

  IF v_existing_seat IS NULL THEN
    INSERT INTO public.seats (
      round_id,
      fingerprint_hash,
      browser_instance_id,
      user_agent,
      ip_address,
      estado
    ) VALUES (
      p_round_id,
      p_fingerprint_hash,
      p_browser_instance_id,
      p_user_agent,
      p_ip_address,
      'ocupado'
    )
    RETURNING * INTO v_existing_seat;

    v_is_new := TRUE;
  ELSE
    UPDATE public.seats
    SET
      last_seen_at = NOW(),
      estado = 'ocupado',
      user_agent = COALESCE(p_user_agent, user_agent),
      ip_address = COALESCE(p_ip_address, ip_address)
    WHERE id = v_existing_seat.id
    RETURNING * INTO v_existing_seat;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'seat_id', v_existing_seat.id,
    'is_new', v_is_new,
    'occupied_seats', count_occupied_seats(p_round_id),
    'max_votantes', v_max_votantes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_seat(
  p_round_id UUID,
  p_fingerprint_hash TEXT,
  p_browser_instance_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_seat RECORD;
BEGIN
  SELECT *
  INTO v_seat
  FROM public.seats
  WHERE round_id = p_round_id
    AND (fingerprint_hash = p_fingerprint_hash OR browser_instance_id = p_browser_instance_id)
  ORDER BY joined_at DESC
  LIMIT 1;

  IF v_seat IS NULL THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error_code', 'SEAT_NOT_FOUND',
      'message', 'No se encontró un asiento asignado'
    );
  END IF;

  IF v_seat.estado = 'expirado' THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error_code', 'SEAT_EXPIRED',
      'message', 'El asiento expiró'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'seat_id', v_seat.id,
    'round_id', v_seat.round_id,
    'message', 'Asiento válido'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_round_seats_status(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_votantes INTEGER;
  v_occupied INTEGER;
  v_expired INTEGER;
BEGIN
  SELECT get_max_votantes(p_round_id) INTO v_max_votantes;
  SELECT COUNT(*) INTO v_occupied FROM public.seats WHERE round_id = p_round_id AND estado = 'ocupado';
  SELECT COUNT(*) INTO v_expired FROM public.seats WHERE round_id = p_round_id AND estado = 'expirado';

  IF v_max_votantes = 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda no existe o no tiene cupos configurados'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'round_id', p_round_id,
    'max_votantes', v_max_votantes,
    'occupied_seats', v_occupied,
    'expired_seats', v_expired,
    'available_seats', GREATEST(v_max_votantes - v_occupied, 0),
    'is_full', v_occupied >= v_max_votantes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_round_seats(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.seats WHERE round_id = p_round_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_inactive_seats(p_timeout_minutes INTEGER DEFAULT 10)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.seats
  SET estado = 'expirado'
  WHERE estado = 'ocupado'
    AND last_seen_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN COALESCE(v_updated, 0);
END;
$$;

COMMIT;

DO $$ BEGIN
  RAISE NOTICE '✅ Migración completada. Ejecuta verify-migration.sql para validar resultados.';
END $$;
