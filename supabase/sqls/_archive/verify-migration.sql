-- ============================================================================
-- VERIFICACIÓN: Comprobar si la migración fue ejecutada
-- ============================================================================
-- Este script verifica si todos los elementos necesarios existen
-- ============================================================================

-- 1. Verificar si existe la columna votes_current_round
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'rounds' 
  AND column_name = 'votes_current_round';

-- 2. Verificar funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_unique_voters_count',
    'calculate_round_results_with_majority',
    'process_round_results',
    'calculate_max_votes',
    'start_new_round'
  )
ORDER BY routine_name;

-- 3. Verificar trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_votes_current_round_trigger';

-- 4. Verificar restricción de votos
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'votes'
  AND constraint_name = 'votes_round_device_candidate_unique';

-- ============================================================================
-- RESULTADO ESPERADO:
-- - 1 fila con votes_current_round (integer, default 0)
-- - 5 filas con las funciones
-- - 1 fila con el trigger
-- - 1 fila con la restricción
-- ============================================================================
