# 🔄 INSTRUCCIONES DE MIGRACIÓN - Sistema de Votaciones MCM

## ⚠️ IMPORTANTE: LEE ESTO PRIMERO

Estas migraciones transforman el sistema de votaciones para implementar:
1. **Umbral fijo de selección** basado en `max_votantes` (no en votos emitidos)
2. **Sistema de cupos** con bloqueo por dispositivo/navegador

### Respaldo de Seguridad
```sql
-- EJECUTAR ANTES DE CUALQUIER MIGRACIÓN
-- Crear backup de las tablas críticas
CREATE TABLE rounds_backup AS SELECT * FROM rounds;
CREATE TABLE candidates_backup AS SELECT * FROM candidates;
CREATE TABLE votes_backup AS SELECT * FROM votes;
CREATE TABLE round_results_backup AS SELECT * FROM round_results;
```

## 📋 Orden de ejecución

> 📌 **Atajo recomendado**: ejecuta `supabase/sqls/upgrade-to-v2-0-0.sql` para aplicar todas las migraciones de la versión 2.0.0 en una sola corrida. El archivo incluye los pasos 1 a 4 descritos abajo y muestra avisos en cada fase.

Si prefieres correr cada script individualmente, ejecútalos en el **Supabase SQL Editor** en este orden exacto:

### ✅ Paso 1: Renombrar expected_voters → max_votantes
**Archivo**: `supabase/sqls/001-rename-expected-voters-to-max-votantes.sql`

**Qué hace**:
- Renombra la columna `expected_voters` a `max_votantes` en la tabla `rounds`
- Actualiza comentarios de documentación

**Validación**:
```sql
-- Verificar que la columna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rounds' AND column_name = 'max_votantes';

-- Debe retornar 1 fila: max_votantes | integer
```

**Rollback si es necesario**:
```sql
ALTER TABLE public.rounds RENAME COLUMN max_votantes TO expected_voters;
```

---

### ✅ Paso 2: Crear tabla de asientos (seats)
**Archivo**: `supabase/sqls/002-create-seats-table.sql`

**Qué hace**:
- Crea tipo enum `seat_status` (libre, ocupado, expirado)
- Crea tabla `seats` con fingerprinting completo
- Añade columna `seat_id` a tabla `votes`
- Crea índices optimizados
- Añade funciones helper: `count_occupied_seats()`, `get_max_votantes()`

**Validación**:
```sql
-- Verificar que la tabla existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'seats';

-- Verificar que votes tiene seat_id
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'votes' AND column_name = 'seat_id';

-- Probar funciones helper
SELECT count_occupied_seats('00000000-0000-0000-0000-000000000000'::UUID);
```

**Rollback si es necesario**:
```sql
DROP TABLE IF EXISTS public.seats CASCADE;
ALTER TABLE public.votes DROP COLUMN IF EXISTS seat_id;
DROP FUNCTION IF EXISTS count_occupied_seats(UUID);
DROP FUNCTION IF EXISTS get_max_votantes(UUID);
DROP TYPE IF EXISTS seat_status;
```

---

### ✅ Paso 3: Actualizar lógica de mayoría a umbral fijo
**Archivo**: `supabase/sqls/003-update-majority-to-fixed-threshold.sql`

**Qué hace**:
- Crea función `calculate_selection_threshold(max_votantes)` → `ceil(0.5 * max_votantes)`
- Actualiza `calculate_round_results_with_majority()` para usar umbral fijo
- Actualiza `process_round_results()` con información de umbral
- Incluye tests automáticos de validación

**Validación**:
```sql
-- Verificar función de umbral
SELECT calculate_selection_threshold(3); -- Debe retornar: 2
SELECT calculate_selection_threshold(4); -- Debe retornar: 2
SELECT calculate_selection_threshold(5); -- Debe retornar: 3

-- Simular escenario: max_votantes=3, 1 votante con 3 votos
-- (los candidatos NO deben ser seleccionados)
```

**Importante**: Esta migración REEMPLAZA las funciones existentes de cálculo de mayoría.

**Rollback**: 
Restaurar funciones desde `supabase/sqls/fix-majority-calculation-people.sql` (versión anterior).

---

### ✅ Paso 4: Crear API de gestión de asientos
**Archivo**: `supabase/sqls/004-seats-management-api.sql`

**Qué hace**:
- `join_round_seat()`: asignar/recuperar asiento
- `verify_seat()`: validar asiento activo
- `get_round_seats_status()`: consultar estado de cupos
- `clear_round_seats()`: limpiar asientos al finalizar
- `expire_inactive_seats()`: mantenimiento de timeouts

**Validación**:
```sql
-- Probar join_round_seat con una ronda existente
SELECT join_round_seat(
  (SELECT id FROM rounds LIMIT 1), -- round_id
  'test_fingerprint_123',
  'test_browser_456',
  'Mozilla/5.0...',
  '192.168.1.1'
);

-- Debe retornar JSON con success: true, seat_id, is_new: true

-- Verificar estado de asientos
SELECT get_round_seats_status((SELECT id FROM rounds LIMIT 1));
```

**Rollback si es necesario**:
```sql
DROP FUNCTION IF EXISTS join_round_seat(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_seat(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_round_seats_status(UUID);
DROP FUNCTION IF EXISTS clear_round_seats(UUID);
DROP FUNCTION IF EXISTS expire_inactive_seats(INTEGER);
```

---

## 🧪 PRUEBAS POST-MIGRACIÓN

### Test 1: Umbral de Selección (CA1)
```sql
-- Escenario: max_votantes=3, solo 1 persona vota por 3 candidatos
-- RESULTADO ESPERADO: 0 candidatos seleccionados

-- 1. Crear ronda de prueba
INSERT INTO rounds (title, year, team, max_votantes, max_selected_candidates, is_active)
VALUES ('Test Umbral', 2025, 'ECE', 3, 6, true)
RETURNING id;

-- Usar el ID retornado (ejemplo: 'abc-123-...')

-- 2. Crear 3 candidatos
INSERT INTO candidates (round_id, name, surname, order_index)
VALUES 
  ('abc-123-...', 'Candidato', 'A', 1),
  ('abc-123-...', 'Candidato', 'B', 2),
  ('abc-123-...', 'Candidato', 'C', 3);

-- 3. Crear 1 asiento
SELECT join_round_seat(
  'abc-123-...'::UUID,
  'fingerprint_voter1',
  'browser_voter1',
  'Mozilla/5.0',
  '127.0.0.1'
);

-- 4. Simular 3 votos del mismo votante (1 por candidato)
-- (Insertar manualmente en tabla votes con mismo device_hash/seat_id)

-- 5. Procesar resultados
SELECT process_round_results('abc-123-...'::UUID, 1);

-- 6. Verificar que NINGÚN candidato fue seleccionado
SELECT name, surname, is_selected 
FROM candidates 
WHERE round_id = 'abc-123-...';

-- ESPERADO: todas las filas con is_selected = false
```

### Test 2: Cupos Llenos (CA4)
```sql
-- Escenario: max_votantes=3, intentar 4to dispositivo
-- RESULTADO ESPERADO: 4to recibe error ROUND_FULL

-- 1. Unir 3 dispositivos
SELECT join_round_seat('abc-123-...'::UUID, 'fp1', 'br1', NULL, NULL);
SELECT join_round_seat('abc-123-...'::UUID, 'fp2', 'br2', NULL, NULL);
SELECT join_round_seat('abc-123-...'::UUID, 'fp3', 'br3', NULL, NULL);

-- 2. Intentar 4to dispositivo
SELECT join_round_seat('abc-123-...'::UUID, 'fp4', 'br4', NULL, NULL);

-- ESPERADO: 
-- { "success": false, "error_code": "ROUND_FULL", "occupied_seats": 3, "max_votantes": 3 }
```

### Test 3: Reingreso Exitoso (CA5, CA7)
```sql
-- Escenario: mismo fingerprint + browser_instance_id puede reingresar

-- 1. Unir dispositivo
SELECT join_round_seat('abc-123-...'::UUID, 'fp_same', 'br_same', NULL, NULL);

-- 2. "Salir" (simular cierre de pestaña - no hacer nada)

-- 3. Reintentar con mismos datos
SELECT join_round_seat('abc-123-...'::UUID, 'fp_same', 'br_same', NULL, NULL);

-- ESPERADO:
-- { "success": true, "seat_id": "...", "is_new": false, "message": "Reingreso exitoso..." }
```

### Test 4: Bloqueo por Cambio de Navegador (CA6)
```sql
-- Escenario: mismo fingerprint pero diferente browser_instance_id = bloqueado

-- 1. Unir con fingerprint X + browser A
SELECT join_round_seat('abc-123-...'::UUID, 'fp_device1', 'browser_A', NULL, NULL);

-- 2. Intentar con fingerprint X + browser B (diferente navegador)
SELECT join_round_seat('abc-123-...'::UUID, 'fp_device1', 'browser_B', NULL, NULL);

-- ESPERADO (si cupo no lleno):
-- Se crea un NUEVO asiento (cada combinación única es un asiento diferente)
-- Pero al votar, verify_seat rechazará si no coincide con el asiento original
```

---

## 📊 LIMPIEZA DE DATOS DE PRUEBA

```sql
-- Eliminar rondas de prueba
DELETE FROM rounds WHERE title LIKE 'Test%';

-- Limpiar asientos expirados
SELECT expire_inactive_seats(10); -- Expira asientos inactivos >10 min

-- Restaurar desde backup si algo salió mal
TRUNCATE TABLE rounds;
INSERT INTO rounds SELECT * FROM rounds_backup;
-- (Repetir para otras tablas según necesidad)
```

---

## ⚙️ CONFIGURACIÓN RECOMENDADA POST-MIGRACIÓN

### 1. Job de Mantenimiento (pg_cron)
```sql
-- Ejecutar cada 5 minutos para expirar asientos inactivos
SELECT cron.schedule(
  'expire-inactive-seats',
  '*/5 * * * *', -- Cada 5 minutos
  $$SELECT expire_inactive_seats(10)$$
);
```

### 2. Trigger para Limpiar Asientos al Cerrar Ronda
```sql
CREATE OR REPLACE FUNCTION cleanup_seats_on_round_close()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_closed = true AND OLD.is_closed = false THEN
    PERFORM clear_round_seats(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_seats_trigger
  AFTER UPDATE OF is_closed ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_seats_on_round_close();
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "column expected_voters does not exist"
**Causa**: La aplicación frontend aún usa `expected_voters`  
**Solución**: Desplegar los cambios de frontend actualizados (VotingManagement.tsx, etc.)

### Error: "function calculate_selection_threshold does not exist"
**Causa**: Migración 003 no se ejecutó correctamente  
**Solución**: Verificar logs de Supabase y re-ejecutar migración 003

### Asientos no se liberan automáticamente
**Causa**: Job de mantenimiento no está configurado  
**Solución**: Ejecutar manualmente `SELECT expire_inactive_seats(10);` o configurar pg_cron

### Votantes bloqueados incorrectamente
**Causa**: Posible problema con fingerprinting en navegadores privados  
**Solución**: Verificar que `browser_instance_id` se esté persistiendo correctamente en localStorage

---

## 📞 SOPORTE

Si encuentras problemas durante la migración:
1. **NO** continuar con migraciones adicionales
2. Consultar logs de Supabase: Dashboard → SQL Editor → History
3. Ejecutar rollback de la última migración
4. Revisar archivo `IMPLEMENTATION_SUMMARY.md` para contexto adicional

## ✅ CHECKLIST FINAL

- [ ] Backup de todas las tablas críticas
- [ ] Migración 001 ejecutada y validada
- [ ] Migración 002 ejecutada y validada
- [ ] Migración 003 ejecutada y validada
- [ ] Migración 004 ejecutada y validada
- [ ] Tests post-migración ejecutados y pasados
- [ ] Job de mantenimiento configurado
- [ ] Trigger de limpieza configurado
- [ ] Frontend desplegado con cambios actualizados
- [ ] Documentación actualizada para usuarios finales

---

**Fecha de creación**: 2025-10-10  
**Versión**: 1.0.0  
**Compatibilidad**: Requiere frontend actualizado con cambios de `device.ts` y tipos TypeScript
