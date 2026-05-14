-- ============================================================================
-- MIGRATION: Agregar campo show_results_to_voters
-- ============================================================================
-- Este script agrega el campo show_results_to_voters a la tabla rounds
-- para controlar la visibilidad de resultados a los votantes
-- ============================================================================

-- 1. Agregar campo votes_current_round (si no existe)
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS votes_current_round INTEGER DEFAULT 0;

-- 2. Agregar campo show_results_to_voters
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS show_results_to_voters BOOLEAN DEFAULT FALSE;

-- 3. Agregar comentarios explicativos
COMMENT ON COLUMN public.rounds.votes_current_round IS 
'Contador de votos en la ronda actual. Se resetea a 0 al iniciar una nueva ronda.';

COMMENT ON COLUMN public.rounds.show_results_to_voters IS 
'Controla si los resultados son visibles para los votantes. TRUE = resultados visibles, FALSE = resultados ocultos. Solo tiene efecto cuando round_finalized = TRUE.';

-- 3. Actualizar función start_new_round para resetear ambos flags
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

-- 4. Verificar que los campos fueron agregados correctamente
DO $$
DECLARE
  votes_column_exists BOOLEAN;
  show_results_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rounds' 
      AND column_name = 'votes_current_round'
  ) INTO votes_column_exists;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rounds' 
      AND column_name = 'show_results_to_voters'
  ) INTO show_results_column_exists;
  
  IF votes_column_exists AND show_results_column_exists THEN
    RAISE NOTICE '✅ Campos votes_current_round y show_results_to_voters agregados exitosamente a la tabla rounds';
  ELSE
    IF NOT votes_column_exists THEN
      RAISE EXCEPTION '❌ Error: El campo votes_current_round no se pudo agregar';
    END IF;
    IF NOT show_results_column_exists THEN
      RAISE EXCEPTION '❌ Error: El campo show_results_to_voters no se pudo agregar';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- TESTING QUERIES (opcional - ejecutar después de la migración)
-- ============================================================================

-- Ver la estructura de la tabla rounds
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'rounds' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Ver valores actuales de los flags de control
-- SELECT 
--   id, 
--   title, 
--   round_finalized, 
--   show_results_to_voters,
--   is_closed
-- FROM public.rounds;
