-- ============================================================================
-- FIX: Calcular mayoría absoluta sobre votos esperados, no votos actuales
-- ============================================================================
-- El porcentaje debe calcularse sobre el número esperado de votantes
-- según la configuración dinámica de la ronda, no sobre los votos actuales
-- ============================================================================

-- 1. Agregar campo percentage a round_results
ALTER TABLE public.round_results 
ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;

-- 2. Crear función para calcular resultados con mayoría basada en votos esperados
CREATE OR REPLACE FUNCTION calculate_round_results_with_majority(p_round_id UUID, p_round_number INTEGER)
RETURNS TABLE (
  candidate_id UUID,
  vote_count BIGINT,
  percentage NUMERIC,
  has_absolute_majority BOOLEAN
) AS $$
DECLARE
  total_voters INTEGER;
  expected_voters INTEGER;
  remaining_candidates INTEGER;
  max_candidates INTEGER;
  selected_count INTEGER;
BEGIN
  -- Obtener configuración de la ronda
  SELECT 
    max_selected_candidates,
    selected_candidates_count
  INTO max_candidates, selected_count
  FROM public.rounds
  WHERE id = p_round_id;
  
  -- Calcular candidatos pendientes
  remaining_candidates := max_candidates - selected_count;
  
  -- Determinar votantes esperados según candidatos pendientes
  -- Esto debe coincidir con la lógica del frontend
  IF remaining_candidates > 2 THEN
    expected_voters := remaining_candidates;  -- Si faltan más de 2, todos pueden votar
  ELSIF remaining_candidates >= 2 THEN
    expected_voters := 2;  -- Si faltan 2, se espera max 2 votos
  ELSE
    expected_voters := 1;  -- Si falta 1, se espera 1 voto
  END IF;
  
  -- Obtener total de votantes únicos actuales en esta ronda
  SELECT get_unique_voters_count(p_round_id, p_round_number) INTO total_voters;
  
  RETURN QUERY
  SELECT 
    v.candidate_id,
    COUNT(v.id) as vote_count,
    CASE 
      WHEN expected_voters > 0 THEN (COUNT(v.id)::NUMERIC / expected_voters::NUMERIC * 100)
      ELSE 0
    END as percentage,
    CASE 
      -- Mayoría absoluta: más del 50% de los votos ESPERADOS
      WHEN expected_voters > 0 THEN (COUNT(v.id)::NUMERIC / expected_voters::NUMERIC) > 0.5
      ELSE false
    END as has_absolute_majority
  FROM public.votes v
  WHERE v.round_id = p_round_id 
    AND v.round_number = p_round_number
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar process_round_results para guardar el percentage
CREATE OR REPLACE FUNCTION process_round_results(p_round_id UUID, p_round_number INTEGER)
RETURNS JSON AS $$
DECLARE
  result JSON;
  selected_count INTEGER;
BEGIN
  -- Marcar candidatos con mayoría absoluta como seleccionados
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
  
  -- Actualizar contador de candidatos seleccionados
  UPDATE public.rounds
  SET 
    selected_candidates_count = (
      SELECT COUNT(*) 
      FROM public.candidates 
      WHERE round_id = p_round_id AND is_selected = true
    ),
    updated_at = NOW()
  WHERE id = p_round_id;
  
  -- Guardar resultados en round_results (incluyendo percentage)
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
  
  -- Retornar resumen
  SELECT json_build_object(
    'total_voters', get_unique_voters_count(p_round_id, p_round_number),
    'candidates_with_majority', (SELECT COUNT(*) FROM calculate_round_results_with_majority(p_round_id, p_round_number) WHERE has_absolute_majority = true),
    'total_selected', (SELECT selected_candidates_count FROM public.rounds WHERE id = p_round_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
