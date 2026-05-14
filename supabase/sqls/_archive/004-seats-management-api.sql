-- ============================================================================
-- MIGRACIÓN: API de gestión de asientos (seats management)
-- ============================================================================
-- Funciones para unirse a una ronda, verificar asientos, y consultar estado
-- ============================================================================

-- 1. Función: Unirse a una ronda (join_round_seat)
-- Asigna un asiento a un usuario o permite reingreso si ya lo tiene
CREATE OR REPLACE FUNCTION join_round_seat(
  p_round_id UUID,
  p_fingerprint_hash TEXT,
  p_browser_instance_id TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_max_votantes INTEGER;
  v_occupied_seats INTEGER;
  v_existing_seat seats%ROWTYPE;
  v_new_seat_id UUID;
  v_grace_period_minutes INTEGER := 10;
  result JSON;
BEGIN
  -- Obtener max_votantes de la ronda
  SELECT max_votantes INTO v_max_votantes
  FROM public.rounds
  WHERE id = p_round_id;
  
  IF v_max_votantes IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  END IF;
  
  -- Buscar asiento existente para este fingerprint + browser_instance_id
  SELECT * INTO v_existing_seat
  FROM public.seats
  WHERE round_id = p_round_id
    AND fingerprint_hash = p_fingerprint_hash
    AND browser_instance_id = p_browser_instance_id;
  
  -- Si ya tiene un asiento, permitir reingreso
  IF FOUND THEN
    -- Actualizar last_seen_at
    UPDATE public.seats
    SET 
      last_seen_at = NOW(),
      estado = 'ocupado',
      updated_at = NOW()
    WHERE id = v_existing_seat.id;
    
    RETURN json_build_object(
      'success', true,
      'seat_id', v_existing_seat.id,
      'is_new', false,
      'message', 'Reingreso exitoso al asiento existente'
    );
  END IF;
  
  -- Si no tiene asiento, verificar si hay cupo disponible
  SELECT count_occupied_seats(p_round_id) INTO v_occupied_seats;
  
  IF v_occupied_seats >= v_max_votantes THEN
    -- Ronda llena - buscar asientos expirados que puedan reutilizarse
    -- (asientos que no han mostrado actividad en > grace_period_minutes)
    SELECT * INTO v_existing_seat
    FROM public.seats
    WHERE round_id = p_round_id
      AND estado = 'ocupado'
      AND last_seen_at < (NOW() - (v_grace_period_minutes || ' minutes')::INTERVAL)
    ORDER BY last_seen_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Marcar asiento antiguo como expirado y crear uno nuevo
      UPDATE public.seats
      SET estado = 'expirado', updated_at = NOW()
      WHERE id = v_existing_seat.id;
      
      -- Crear nuevo asiento
      INSERT INTO public.seats (
        round_id,
        fingerprint_hash,
        browser_instance_id,
        user_agent,
        ip_address,
        estado
      ) VALUES (
        p_round_id,
        p_fingerprint_hash,
        p_browser_instance_id,
        p_user_agent,
        p_ip_address,
        'ocupado'
      ) RETURNING id INTO v_new_seat_id;
      
      RETURN json_build_object(
        'success', true,
        'seat_id', v_new_seat_id,
        'is_new', true,
        'message', 'Asiento asignado (se liberó un asiento expirado)'
      );
    ELSE
      -- No hay cupo disponible
      RETURN json_build_object(
        'success', false,
        'error_code', 'ROUND_FULL',
        'message', 'La ronda está completa. No hay asientos disponibles.',
        'occupied_seats', v_occupied_seats,
        'max_votantes', v_max_votantes
      );
    END IF;
  END IF;
  
  -- Hay cupo disponible, crear nuevo asiento
  INSERT INTO public.seats (
    round_id,
    fingerprint_hash,
    browser_instance_id,
    user_agent,
    ip_address,
    estado
  ) VALUES (
    p_round_id,
    p_fingerprint_hash,
    p_browser_instance_id,
    p_user_agent,
    p_ip_address,
    'ocupado'
  ) RETURNING id INTO v_new_seat_id;
  
  RETURN json_build_object(
    'success', true,
    'seat_id', v_new_seat_id,
    'is_new', true,
    'message', 'Asiento asignado exitosamente',
    'occupied_seats', v_occupied_seats + 1,
    'max_votantes', v_max_votantes
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Función: Verificar validez de un asiento
CREATE OR REPLACE FUNCTION verify_seat(
  p_seat_id UUID,
  p_fingerprint_hash TEXT,
  p_browser_instance_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_seat seats%ROWTYPE;
  v_grace_period_minutes INTEGER := 10;
BEGIN
  -- Buscar el asiento
  SELECT * INTO v_seat
  FROM public.seats
  WHERE id = p_seat_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error_code', 'SEAT_NOT_FOUND',
      'message', 'El asiento no existe'
    );
  END IF;
  
  -- Verificar que el fingerprint y browser_instance_id coincidan
  IF v_seat.fingerprint_hash != p_fingerprint_hash OR 
     v_seat.browser_instance_id != p_browser_instance_id THEN
    RETURN json_build_object(
      'valid', false,
      'error_code', 'SEAT_MISMATCH',
      'message', 'El dispositivo o navegador no coincide con el asiento asignado'
    );
  END IF;
  
  -- Verificar que el asiento no esté expirado
  IF v_seat.estado = 'expirado' THEN
    RETURN json_build_object(
      'valid', false,
      'error_code', 'SEAT_EXPIRED',
      'message', 'El asiento ha expirado por inactividad'
    );
  END IF;
  
  -- Verificar que no haya pasado mucho tiempo desde la última actividad
  IF v_seat.last_seen_at < (NOW() - (v_grace_period_minutes || ' minutes')::INTERVAL) THEN
    -- Marcar como expirado
    UPDATE public.seats
    SET estado = 'expirado', updated_at = NOW()
    WHERE id = p_seat_id;
    
    RETURN json_build_object(
      'valid', false,
      'error_code', 'SEAT_TIMEOUT',
      'message', 'El asiento ha expirado por timeout (más de ' || v_grace_period_minutes || ' minutos sin actividad)'
    );
  END IF;
  
  -- Asiento válido, actualizar last_seen_at
  UPDATE public.seats
  SET last_seen_at = NOW(), updated_at = NOW()
  WHERE id = p_seat_id;
  
  RETURN json_build_object(
    'valid', true,
    'seat_id', v_seat.id,
    'round_id', v_seat.round_id,
    'message', 'Asiento válido'
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Función: Obtener estado de asientos de una ronda
CREATE OR REPLACE FUNCTION get_round_seats_status(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  v_max_votantes INTEGER;
  v_occupied_seats INTEGER;
  v_expired_seats INTEGER;
  v_available_seats INTEGER;
  result JSON;
BEGIN
  -- Obtener max_votantes
  SELECT max_votantes INTO v_max_votantes
  FROM public.rounds
  WHERE id = p_round_id;
  
  IF v_max_votantes IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'ROUND_NOT_FOUND',
      'message', 'La ronda especificada no existe'
    );
  END IF;
  
  -- Contar asientos ocupados
  SELECT COUNT(*) INTO v_occupied_seats
  FROM public.seats
  WHERE round_id = p_round_id AND estado = 'ocupado';
  
  -- Contar asientos expirados
  SELECT COUNT(*) INTO v_expired_seats
  FROM public.seats
  WHERE round_id = p_round_id AND estado = 'expirado';
  
  -- Calcular asientos disponibles
  v_available_seats := v_max_votantes - v_occupied_seats;
  IF v_available_seats < 0 THEN
    v_available_seats := 0;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'round_id', p_round_id,
    'max_votantes', v_max_votantes,
    'occupied_seats', v_occupied_seats,
    'expired_seats', v_expired_seats,
    'available_seats', v_available_seats,
    'is_full', v_occupied_seats >= v_max_votantes
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Función: Liberar todos los asientos de una ronda (para resetear)
CREATE OR REPLACE FUNCTION clear_round_seats(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.seats
  WHERE round_id = p_round_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Asientos liberados exitosamente',
    'deleted_count', v_deleted_count
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Función: Expirar asientos inactivos (tarea de mantenimiento)
CREATE OR REPLACE FUNCTION expire_inactive_seats(
  p_grace_period_minutes INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.seats
  SET estado = 'expirado', updated_at = NOW()
  WHERE estado = 'ocupado'
    AND last_seen_at < (NOW() - (p_grace_period_minutes || ' minutes')::INTERVAL);
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Asientos inactivos expirados',
    'expired_count', v_expired_count
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON FUNCTION join_round_seat IS 
  'Asigna un asiento a un usuario en una ronda específica. Permite reingreso si el fingerprint + browser_instance_id ya tienen un asiento. Retorna error ROUND_FULL si no hay cupo disponible.';

COMMENT ON FUNCTION verify_seat IS 
  'Verifica que un asiento sea válido para el fingerprint y browser_instance_id dados. Actualiza last_seen_at si es válido. Expira automáticamente si ha pasado el período de gracia.';

COMMENT ON FUNCTION get_round_seats_status IS 
  'Obtiene el estado actual de asientos de una ronda: ocupados, disponibles, expirados.';

COMMENT ON FUNCTION clear_round_seats IS 
  'Elimina todos los asientos de una ronda (usar al finalizar ronda o resetear).';

COMMENT ON FUNCTION expire_inactive_seats IS 
  'Tarea de mantenimiento: marca como expirados los asientos sin actividad reciente.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de gestión de asientos creadas exitosamente:';
  RAISE NOTICE '   - join_round_seat';
  RAISE NOTICE '   - verify_seat';
  RAISE NOTICE '   - get_round_seats_status';
  RAISE NOTICE '   - clear_round_seats';
  RAISE NOTICE '   - expire_inactive_seats';
END $$;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- - join_round_seat: asigna asientos respetando max_votantes
-- - verify_seat: valida fingerprint + browser_instance_id
-- - get_round_seats_status: consulta estado de asientos
-- - clear_round_seats: limpia asientos al finalizar ronda
-- - expire_inactive_seats: mantenimiento automático de timeouts
-- ============================================================================
