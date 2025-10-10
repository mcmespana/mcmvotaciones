-- ============================================================================
-- MIGRATION: Agregar campo para trackear rondas finalizadas
-- ============================================================================
-- Este script agrega un campo para saber si una ronda ha sido finalizada
-- y sus resultados ya están calculados
-- ============================================================================

-- 1. Agregar campo round_finalized
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS round_finalized BOOLEAN DEFAULT FALSE;

-- 2. Agregar comentario explicativo
COMMENT ON COLUMN public.rounds.round_finalized IS 
'Indica si la ronda actual ha sido finalizada y los resultados calculados. TRUE = finalizada con resultados visibles, FALSE = ronda en progreso o nueva ronda iniciada.';

-- 3. Actualizar función start_new_round para resetear el flag
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
  
  -- Increment round number, reset votes counter, update max votes, and reset finalized flag
  UPDATE rounds
  SET 
    current_round_number = current_round_num + 1,
    votes_current_round = 0,
    max_votes_per_round = new_max_votes,
    round_finalized = FALSE,  -- Nueva ronda = no finalizada
    selected_candidates_count = selected_count
  WHERE id = p_round_id;
  
  -- Return info about the new round
  result := json_build_object(
    'round_number', current_round_num + 1,
    'max_votes_per_round', new_max_votes,
    'selected_count', selected_count,
    'remaining_count', remaining_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para verificar que el campo se agregó correctamente:
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rounds' 
  AND column_name = 'round_finalized';

-- Resultado esperado:
-- column_name: round_finalized
-- data_type: boolean
-- column_default: false
-- is_nullable: YES
-- ============================================================================
