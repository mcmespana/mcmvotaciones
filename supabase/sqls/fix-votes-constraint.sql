-- ============================================================================
-- FIX: Permitir múltiples votos por persona en la misma ronda
-- ============================================================================
-- Este script corrige la restricción UNIQUE en la tabla votes
-- para permitir que cada persona vote por múltiples candidatos
-- ============================================================================

-- 1. Eliminar la restricción incorrecta actual
ALTER TABLE public.votes 
DROP CONSTRAINT IF EXISTS votes_round_id_device_hash_round_number_key;

-- 2. Agregar nueva restricción correcta que incluye candidate_id
-- Esto permite múltiples votos (uno por candidato) de la misma persona en la misma ronda
ALTER TABLE public.votes 
ADD CONSTRAINT votes_round_device_candidate_unique 
UNIQUE (round_id, device_hash, round_number, candidate_id);

-- 3. Crear índice para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_votes_round_device_number 
ON public.votes(round_id, device_hash, round_number);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para verificar que la restricción se aplicó correctamente:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'votes';
-- ============================================================================

-- IMPORTANTE: 
-- Si tienes datos existentes con votos duplicados, necesitas limpiarlos primero
-- Este script asume que no hay duplicados exactos (misma persona votando 
-- al mismo candidato dos veces en la misma ronda)
-- ============================================================================
