-- ============================================================================
-- MIGRATION: Fix Voting Rounds System
-- ============================================================================
-- Este script corrige el sistema de votaciones por rondas
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar campo para contar votos de la ronda actual
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS votes_current_round INTEGER DEFAULT 0;

-- 2. Actualizar valores existentes
UPDATE public.rounds r
SET votes_current_round = (
  SELECT COUNT(DISTINCT v.device_hash)
  FROM public.votes v
  WHERE v.round_id = r.id 
    AND v.round_number = r.current_round_number
);

-- 3. Crear función para obtener conteo de votos únicos por ronda
CREATE OR REPLACE FUNCTION get_unique_voters_count(p_round_id UUID, p_round_number INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT device_hash)
    FROM public.votes
    WHERE round_id = p_round_id 
      AND round_number = p_round_number
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Crear función para calcular resultados y detectar mayoría absoluta
CREATE OR REPLACE FUNCTION calculate_round_results_with_majority(p_round_id UUID, p_round_number INTEGER)
RETURNS TABLE (
  candidate_id UUID,
  vote_count BIGINT,
  percentage NUMERIC,
  has_absolute_majority BOOLEAN
) AS $$
DECLARE
  total_voters INTEGER;
BEGIN
  -- Obtener total de votantes únicos en esta ronda
  SELECT get_unique_voters_count(p_round_id, p_round_number) INTO total_voters;
  
  RETURN QUERY
  SELECT 
    v.candidate_id,
    COUNT(v.id) as vote_count,
    CASE 
      WHEN total_voters > 0 THEN (COUNT(v.id)::NUMERIC / total_voters::NUMERIC * 100)
      ELSE 0
    END as percentage,
    CASE 
      WHEN total_voters > 0 THEN (COUNT(v.id)::NUMERIC / total_voters::NUMERIC) > 0.5
      ELSE false
    END as has_absolute_majority
  FROM public.votes v
  WHERE v.round_id = p_round_id 
    AND v.round_number = p_round_number
  GROUP BY v.candidate_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear función para procesar resultados y seleccionar candidatos con mayoría absoluta
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
  
  -- Guardar resultados en round_results
  INSERT INTO public.round_results (round_id, round_number, candidate_id, vote_count, is_visible)
  SELECT 
    p_round_id,
    p_round_number,
    candidate_id,
    vote_count::INTEGER,
    false
  FROM calculate_round_results_with_majority(p_round_id, p_round_number)
  ON CONFLICT (round_id, round_number, candidate_id) 
  DO UPDATE SET 
    vote_count = EXCLUDED.vote_count,
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

-- 6. Crear función para calcular max_votes_per_round dinámicamente
CREATE OR REPLACE FUNCTION calculate_max_votes(p_round_id UUID)
RETURNS INTEGER AS $$
DECLARE
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
  
  -- Determinar máximo de votos según candidatos pendientes
  IF remaining_candidates >= 4 THEN
    RETURN 3;  -- 4 o más pendientes: 3 votos
  ELSIF remaining_candidates >= 2 THEN
    RETURN 2;  -- 2-3 pendientes: 2 votos
  ELSE
    RETURN 1;  -- 1 pendiente: 1 voto
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para actualizar votes_current_round automáticamente
CREATE OR REPLACE FUNCTION update_votes_current_round()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rounds
    SET votes_current_round = get_unique_voters_count(NEW.round_id, NEW.round_number)
    WHERE id = NEW.round_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rounds
    SET votes_current_round = get_unique_voters_count(OLD.round_id, OLD.round_number)
    WHERE id = OLD.round_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_votes_current_round ON public.votes;
CREATE TRIGGER trigger_update_votes_current_round
AFTER INSERT OR DELETE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION update_votes_current_round();

-- 8. Crear función para iniciar nueva ronda
CREATE OR REPLACE FUNCTION start_new_round(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  new_round_number INTEGER;
  new_max_votes INTEGER;
  result JSON;
BEGIN
  -- Obtener número de ronda actual
  SELECT current_round_number + 1 INTO new_round_number
  FROM public.rounds
  WHERE id = p_round_id;
  
  -- Calcular nuevo máximo de votos
  SELECT calculate_max_votes(p_round_id) INTO new_max_votes;
  
  -- Actualizar ronda
  UPDATE public.rounds
  SET 
    current_round_number = new_round_number,
    max_votes_per_round = new_max_votes,
    votes_current_round = 0,
    updated_at = NOW()
  WHERE id = p_round_id;
  
  -- Retornar información
  SELECT json_build_object(
    'round_number', new_round_number,
    'max_votes_per_round', new_max_votes,
    'selected_count', (SELECT selected_candidates_count FROM public.rounds WHERE id = p_round_id),
    'remaining_count', (SELECT max_selected_candidates - selected_candidates_count FROM public.rounds WHERE id = p_round_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================
-- Después de ejecutar esta migración:
-- 1. votes_current_round se actualizará automáticamente con cada voto
-- 2. Usar process_round_results(round_id, round_number) para calcular resultados
-- 3. Usar start_new_round(round_id) para iniciar la siguiente ronda
-- 4. Usar calculate_max_votes(round_id) para obtener el máximo de votos dinámico
-- ============================================================================
