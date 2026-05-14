-- ============================================================================
-- MIGRACIÓN: Renombrar expected_voters a max_votantes
-- ============================================================================
-- Este cambio refleja que max_votantes define el CUPO FIJO de votantes
-- habilitados para cada ronda, NO una expectativa estimada.
-- 
-- El umbral de selección se calcula sobre este valor:
--   umbral = FLOOR(max_votantes / 2) + 1
-- ============================================================================

-- 1. Renombrar la columna en la tabla rounds
ALTER TABLE public.rounds 
RENAME COLUMN expected_voters TO max_votantes;

-- 2. Actualizar comentario de la columna
COMMENT ON COLUMN public.rounds.max_votantes IS 
  'Número máximo de votantes (cupos) habilitados para esta ronda. Define el umbral de selección: floor(max_votantes / 2) + 1';

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
