-- ============================================================================
-- MIGRACIÓN: Actualizar lógica de mayoría a umbral fijo basado en max_votantes
-- ============================================================================
-- Cambia de calcular mayoría sobre votos emitidos a usar un umbral fijo:
--   umbral = FLOOR(max_votantes / 2) + 1
-- 
-- Un candidato es seleccionado solo si: votos_candidato >= umbral
-- 
-- Ejemplos:
--   max_votantes=3 → umbral=2 → mínimo 2 votos para ser seleccionado
--   max_votantes=4 → umbral=3 → mínimo 3 votos para ser seleccionado
--   max_votantes=5 → umbral=3 → mínimo 3 votos para ser seleccionado
-- ============================================================================

-- 1. Función helper: calcular el umbral de selección
CREATE OR REPLACE FUNCTION calculate_selection_threshold(p_max_votantes INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Umbral Canon 119: mitad + 1
  -- Si max_votantes es 0 o NULL, retornar 1 como mínimo
  IF p_max_votantes IS NULL OR p_max_votantes <= 0 THEN
    RETURN 1;
  END IF;
  
  RETURN FLOOR(p_max_votantes / 2.0) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Actualizar función calculate_round_results_with_majority
-- Ahora usa umbral fijo en lugar de porcentaje sobre votos emitidos

-- Primero, eliminar la función existente si tiene firma diferente
DROP FUNCTION IF EXISTS calculate_round_results_with_majority(UUID, INTEGER);

CREATE OR REPLACE FUNCTION calculate_round_results_with_majority(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS TABLE (
  candidate_id UUID,
  vote_count BIGINT,
  percentage NUMERIC,
  has_absolute_majority BOOLEAN,
  threshold_required INTEGER
) AS $$
DECLARE
  total_voters INTEGER; -- unique voters (people) who voted in the round
  max_votantes_value INTEGER; -- cupo máximo de votantes
  selection_threshold INTEGER; -- umbral para ser seleccionado
BEGIN
  -- Obtener max_votantes de la ronda
  SELECT r.max_votantes INTO max_votantes_value
  FROM public.rounds r
  WHERE r.id = p_round_id;
  
  -- Calcular umbral de selección
  selection_threshold := calculate_selection_threshold(max_votantes_value);
  
  -- Get total unique voters for this round (people)
  SELECT get_unique_voters_count(p_round_id, p_round_number) INTO total_voters;

  RETURN QUERY
  SELECT 
    v.candidate_id,
    COUNT(v.id) AS vote_count,
    -- Porcentaje sobre votos emitidos (informativo, NO define selección)
    CASE 
      WHEN total_voters > 0 THEN (COUNT(v.id)::NUMERIC / total_voters::NUMERIC * 100)
      ELSE 0
    END AS percentage,
    -- Mayoría absoluta ahora se define por el umbral fijo
    CASE 
      WHEN COUNT(v.id) >= selection_threshold THEN true
      ELSE false
    END AS has_absolute_majority,
    selection_threshold AS threshold_required
  FROM public.votes v
  WHERE v.round_id = p_round_id 
    AND v.round_number = p_round_number
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar función process_round_results
-- Incluye el threshold en los resultados
CREATE OR REPLACE FUNCTION process_round_results(
  p_round_id UUID,
  p_round_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  max_votantes_value INTEGER;
  selection_threshold INTEGER;
BEGIN
  -- Obtener max_votantes y calcular umbral
  SELECT max_votantes INTO max_votantes_value
  FROM public.rounds
  WHERE id = p_round_id;
  
  selection_threshold := calculate_selection_threshold(max_votantes_value);
  
  -- Mark candidates with absolute majority as selected
  UPDATE public.candidates c
  SET 
    is_selected = true,
    updated_at = NOW()
  FROM (
    SELECT candidate_id, has_absolute_majority
    FROM calculate_round_results_with_majority(p_round_id, p_round_number)
    WHERE has_absolute_majority = true
  ) results
  WHERE c.id = results.candidate_id
    AND c.round_id = p_round_id
    AND c.is_selected = false
    AND c.is_eliminated = false;
  
  -- Update selected candidates counter
  UPDATE public.rounds
  SET 
    selected_candidates_count = (
      SELECT COUNT(*) 
      FROM public.candidates 
      WHERE round_id = p_round_id AND is_selected = true
    ),
    updated_at = NOW()
  WHERE id = p_round_id;
  
  -- Upsert results with percentage
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
  
  -- Return summary with threshold information
  SELECT json_build_object(
    'max_votantes', max_votantes_value,
    'selection_threshold', selection_threshold,
    'total_voters', get_unique_voters_count(p_round_id, p_round_number),
    'candidates_with_majority', (
      SELECT COUNT(*) 
      FROM calculate_round_results_with_majority(p_round_id, p_round_number) 
      WHERE has_absolute_majority = true
    ),
    'total_selected', (
      SELECT selected_candidates_count 
      FROM public.rounds 
      WHERE id = p_round_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar comentarios de funciones
COMMENT ON FUNCTION calculate_selection_threshold IS 
  'Calcula el umbral de selección: FLOOR(max_votantes / 2) + 1. Un candidato necesita al menos este número de votos para ser seleccionado.';

COMMENT ON FUNCTION calculate_round_results_with_majority IS 
  'Calcula resultados de una ronda usando umbral fijo basado en max_votantes. has_absolute_majority = true si vote_count >= FLOOR(max_votantes / 2) + 1';

-- ============================================================================
-- VERIFICACIÓN Y EJEMPLOS
-- ============================================================================

-- Verificar función de umbral
DO $$
BEGIN
  -- Test cases
  ASSERT calculate_selection_threshold(3) = 2, 'max_votantes=3 debe dar umbral=2';
  ASSERT calculate_selection_threshold(4) = 3, 'max_votantes=4 debe dar umbral=3';
  ASSERT calculate_selection_threshold(5) = 3, 'max_votantes=5 debe dar umbral=3';
  ASSERT calculate_selection_threshold(10) = 6, 'max_votantes=10 debe dar umbral=6';
  ASSERT calculate_selection_threshold(0) = 1, 'max_votantes=0 debe dar umbral=1';
  ASSERT calculate_selection_threshold(NULL) = 1, 'max_votantes=NULL debe dar umbral=1';
  
  RAISE NOTICE '✅ Función calculate_selection_threshold verificada correctamente';
END $$;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- - Función calculate_selection_threshold para calcular umbral
-- - calculate_round_results_with_majority usa umbral fijo (no porcentaje)
-- - process_round_results incluye información de umbral en resultado JSON
-- - Un candidato con 1 voto cuando max_votantes=3 NO será seleccionado
-- - Un candidato con 2 votos cuando max_votantes=3 SÍ será seleccionado
-- ============================================================================
