-- ============================================================================
-- MIGRACIÓN: Crear tabla de asientos (seats) para control de cupos
-- ============================================================================
-- Implementa el sistema de cupos fijos por ronda con bloqueo por dispositivo
-- y navegador mediante fingerprinting.
-- ============================================================================

-- 1. Crear tipo enum para el estado de los asientos
DO $$ BEGIN
  CREATE TYPE seat_status AS ENUM ('libre', 'ocupado', 'expirado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla de asientos
CREATE TABLE IF NOT EXISTS public.seats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  
  -- Identificación del dispositivo/navegador
  fingerprint_hash TEXT NOT NULL,
  browser_instance_id TEXT NOT NULL,
  
  -- Información adicional para auditoría
  user_agent TEXT,
  ip_address TEXT,
  
  -- Control de tiempo
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Estado del asiento
  estado seat_status DEFAULT 'ocupado' NOT NULL,
  
  -- Timestamps estándar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Un asiento único por combinación de fingerprint + browser en cada ronda
  UNIQUE(round_id, fingerprint_hash, browser_instance_id)
);

-- 3. Crear índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_seats_round_id ON public.seats(round_id);
CREATE INDEX IF NOT EXISTS idx_seats_fingerprint ON public.seats(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_seats_browser_instance ON public.seats(browser_instance_id);
CREATE INDEX IF NOT EXISTS idx_seats_estado ON public.seats(round_id, estado);
CREATE INDEX IF NOT EXISTS idx_seats_last_seen ON public.seats(last_seen_at) WHERE estado = 'ocupado';

-- 4. Añadir relación con tabla votes (un voto debe estar asociado a un asiento)
ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS seat_id UUID REFERENCES public.seats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_votes_seat_id ON public.votes(seat_id);

-- 5. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_seats_updated_at ON public.seats;
CREATE TRIGGER update_seats_updated_at 
  BEFORE UPDATE ON public.seats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Función helper: contar asientos ocupados en una ronda
CREATE OR REPLACE FUNCTION count_occupied_seats(p_round_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.seats
    WHERE round_id = p_round_id 
      AND estado = 'ocupado'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Función helper: obtener max_votantes de una ronda
CREATE OR REPLACE FUNCTION get_max_votantes(p_round_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT max_votantes
    FROM public.rounds
    WHERE id = p_round_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Habilitar RLS
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- 9. Crear política permisiva (autenticación a nivel de aplicación)
DROP POLICY IF EXISTS "Allow all seats operations" ON public.seats;
CREATE POLICY "Allow all seats operations" ON public.seats FOR ALL USING (true);

-- 10. Conceder permisos
GRANT ALL ON public.seats TO anon, authenticated;

-- 11. Comentarios
COMMENT ON TABLE public.seats IS 
  'Asientos (cupos) de votantes por ronda. Controla el acceso mediante fingerprinting de dispositivo y navegador. Cada ronda tiene max_votantes asientos disponibles.';

COMMENT ON COLUMN public.seats.fingerprint_hash IS 
  'Hash del fingerprint del dispositivo (userAgent, platform, WebGL, etc.)';

COMMENT ON COLUMN public.seats.browser_instance_id IS 
  'ID único persistente del navegador (generado y almacenado en localStorage + cookie)';

COMMENT ON COLUMN public.seats.estado IS 
  'Estado del asiento: libre (liberado manualmente), ocupado (en uso), expirado (timeout)';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  seat_id_column_exists BOOLEAN;
BEGIN
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'seats'
  ) INTO table_exists;
  
  -- Verificar que votes tiene la columna seat_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'votes' 
      AND column_name = 'seat_id'
  ) INTO seat_id_column_exists;
  
  IF table_exists AND seat_id_column_exists THEN
    RAISE NOTICE '✅ Tabla seats y relación con votes creadas exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error en la creación de la tabla seats o relación con votes';
  END IF;
END $$;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- - Nueva tabla 'seats' con control de cupos por ronda
-- - Columna 'seat_id' en tabla 'votes' para asociar cada voto a un asiento
-- - Funciones helper para contar asientos y obtener max_votantes
-- - Índices optimizados para consultas frecuentes
-- ============================================================================
