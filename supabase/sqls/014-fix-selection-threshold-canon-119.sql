-- ============================================================================
-- MIGRATION 014: Fix calculate_selection_threshold (Canon 119)
-- ----------------------------------------------------------------------------
-- Una PR reciente sustituyó la fórmula original FLOOR(n/2)+1 por
-- CEIL(0.5*n), que rompe Canon 119 cuando max_votantes es par:
--   - max=6 → CEIL(3) = 3 votos seleccionarían (3/6 = 50% justo). INCORRECTO.
--   - max=10 → CEIL(5) = 5 votos seleccionarían (5/10 = 50% justo). INCORRECTO.
-- Canon 119 exige mayoría estricta >50%, no >=50%.
-- Fórmula correcta: FLOOR(n/2)+1
--   - max=6 → 4 (4/6 = 66.7% > 50%) ✅
--   - max=10 → 6 (6/10 = 60% > 50%) ✅
--   - max=4 → 3 (3/4 = 75% > 50%) ✅
--   - max=3 → 2 (2/3 = 66.7% > 50%) ✅ (mayoría también para impares)
-- La función está actualmente latente (no la usa ningún flujo activo: el path
-- principal de mayoría va por calculate_round_results_with_majority con ratio
-- > 0.5). Se corrige para evitar bugs futuros si se reintroduce.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_selection_threshold(p_max_votantes INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF p_max_votantes IS NULL OR p_max_votantes <= 0 THEN
    RETURN 1;
  END IF;

  RETURN FLOOR(p_max_votantes / 2.0)::INTEGER + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_selection_threshold(INTEGER) IS
  'Canon 119: umbral de selección = FLOOR(max_votantes/2)+1. Mayoría estricta >50%.';

-- Verificación inline
DO $$
BEGIN
  ASSERT calculate_selection_threshold(3)  = 2,  'max=3 debe dar 2';
  ASSERT calculate_selection_threshold(4)  = 3,  'max=4 debe dar 3';
  ASSERT calculate_selection_threshold(5)  = 3,  'max=5 debe dar 3';
  ASSERT calculate_selection_threshold(6)  = 4,  'max=6 debe dar 4 (no 3)';
  ASSERT calculate_selection_threshold(10) = 6,  'max=10 debe dar 6 (no 5)';
  ASSERT calculate_selection_threshold(100)= 51, 'max=100 debe dar 51 (no 50)';
  ASSERT calculate_selection_threshold(0)  = 1,  'max=0 debe dar 1';
  ASSERT calculate_selection_threshold(NULL) = 1, 'max=NULL debe dar 1';
  RAISE NOTICE 'calculate_selection_threshold corregida y verificada';
END $$;
