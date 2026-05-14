-- ============================================================================
-- HABILITAR SUPABASE REALTIME
-- ============================================================================
-- Este script habilita las publicaciones de Realtime para las tablas necesarias
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Habilitar Realtime para la tabla votes
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- 2. Habilitar Realtime para la tabla round_results
ALTER PUBLICATION supabase_realtime ADD TABLE round_results;

-- 3. Habilitar Realtime para la tabla rounds (para cambios de estado)
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para verificar que las tablas están en la publicación:
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Deberías ver:
-- - votes
-- - round_results
-- - rounds
-- ============================================================================

-- NOTA IMPORTANTE:
-- Si obtienes un error como "relation already added to publication",
-- significa que ya está habilitado. ¡Eso es bueno!
-- ============================================================================
