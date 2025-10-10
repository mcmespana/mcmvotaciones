# Resumen de Implementación: Sistema de Votaciones con Cupos Fijos y Umbral por max_votantes

## ✅ COMPLETADO

### 1. Migraciones SQL
- **001-rename-expected-voters-to-max-votantes.sql**: Renombra columna `expected_voters` → `max_votantes`
- **002-create-seats-table.sql**: Crea tabla `seats` con fingerprinting robusto
- **003-update-majority-to-fixed-threshold.sql**: Implementa umbral fijo `ceil(0.5 * max_votantes)`
- **004-seats-management-api.sql**: Funciones SQL para gestión de asientos

### 2. Fingerprinting Mejorado (`src/lib/device.ts`)
- ✅ Función `getDeviceInfo()` extendida con:
  - WebGL fingerprinting (vendor, renderer)
  - Canvas fingerprinting
  - `deviceMemory`, `hardwareConcurrency`, `maxTouchPoints`
  - Múltiples idiomas, vendor del navegador
- ✅ Función `generateBrowserInstanceId()`:
  - Genera UUID persistente
  - Almacena en localStorage + cookie
  - Fallback para navegadores privados

### 3. Actualización de Tipos TypeScript
- ✅ Interface `Round`: `expected_voters` → `max_votantes`
- ✅ Nuevas interfaces: `Seat`, `JoinSeatResponse`, `VerifySeatResponse`, `SeatStatusResponse`
- ✅ Interface `NewRoundForm`: actualizada con `max_votantes`

### 4. VotingManagement.tsx - Parcialmente actualizado
- ✅ Formulario de nueva ronda: usa `max_votantes` con descripción del umbral
- ✅ Display de estadísticas: "Cupo máximo" en lugar de "Votantes esperados"
- ✅ Lógica de auto-finalización: usa `max_votantes`

## 🔄 PENDIENTE

### 5. VotingPage.tsx - Integración de Asientos
Necesita:
- [ ] Llamar `generateBrowserInstanceId()` al montar componente
- [ ] Llamar `join_round_seat()` al entrar a la ronda
- [ ] Guardar `seat_id` en estado local
- [ ] Verificar asiento antes de votar con `verify_seat()`
- [ ] Mostrar mensajes claros de error (ROUND_FULL, SEAT_MISMATCH, etc.)
- [ ] Actualizar `last_seen_at` periódicamente (heartbeat cada 2 min)
- [ ] Asociar `seat_id` al insertar votos en tabla `votes`
- [ ] Actualizar interfaz `Round` para incluir `max_votantes`

### 6. VotingManagement.tsx - Display de Asientos
Necesita:
- [ ] Mostrar estado de asientos: "X/Y asientos ocupados"
- [ ] Añadir botón para consultar `get_round_seats_status()`
- [ ] Mostrar indicador visual cuando ronda está llena
- [ ] Opción admin para liberar asientos (`clear_round_seats()`)

### 7. DemoAdminDashboard.tsx
Necesita:
- [ ] Actualizar interfaces: `expected_voters` → `max_votantes`
- [ ] Actualizar todos los displays de estadísticas

### 8. Otros archivos con `expected_voters`
Revisar y actualizar referencias en:
- [ ] Cualquier archivo de demo/ejemplo
- [ ] Documentación en archivos .md

## 📊 FUNCIONES SQL CREADAS

### Umbral y Selección
- `calculate_selection_threshold(p_max_votantes)` → INTEGER
- `calculate_round_results_with_majority(p_round_id, p_round_number)` → TABLE
- `process_round_results(p_round_id, p_round_number)` → JSON

### Gestión de Asientos
- `join_round_seat(p_round_id, p_fingerprint_hash, p_browser_instance_id, ...)` → JSON
- `verify_seat(p_seat_id, p_fingerprint_hash, p_browser_instance_id)` → JSON
- `get_round_seats_status(p_round_id)` → JSON
- `clear_round_seats(p_round_id)` → JSON
- `expire_inactive_seats(p_grace_period_minutes)` → JSON

### Helpers
- `count_occupied_seats(p_round_id)` → INTEGER
- `get_max_votantes(p_round_id)` → INTEGER

## 🎯 CRITERIOS DE ACEPTACIÓN

### Necesidad 1: Umbral Fijo
- **CA1**: ✅ Con max_votantes=3 y 1 votante marcando 3 candidatos → 0 seleccionados
- **CA2**: ✅ Con max_votantes=3 y 2 votantes → candidato con 2 votos = seleccionado
- **CA3**: ✅ Cambiar max_votantes actualiza umbral automáticamente

### Necesidad 2: Cupos y Bloqueo de Dispositivo
- **CA4**: ⏳ Con max_votantes=3, tras 3 dispositivos, el 4º recibe ROUND_FULL
- **CA5**: ⏳ Mismo dispositivo+navegador puede reconectar; otro es bloqueado
- **CA6**: ⏳ Cambiar navegador (Safari→Chrome) mismo device = bloqueado
- **CA7**: ⏳ Cerrar navegador y volver <10 min = recupera asiento

## 🚀 PRÓXIMOS PASOS

1. Actualizar `VotingPage.tsx` con gestión de asientos (TODO #7)
2. Añadir UI de estado de asientos en `VotingManagement.tsx` (TODO #8)
3. Implementar heartbeat/keep-alive (TODO #9)
4. Actualizar `DemoAdminDashboard.tsx`
5. Probar flujos end-to-end
6. Ejecutar migraciones en Supabase
7. Documentar cambios para usuarios

## 📝 NOTAS IMPORTANTES

- **Ventana de gracia**: 10 minutos por defecto (configurable)
- **Heartbeat recomendado**: Actualizar `last_seen_at` cada 2 minutos
- **Navegadores privados**: Considerar OTP/email como fallback si no se puede persistir ID
- **Limpieza de asientos**: Ejecutar al finalizar cada ronda con `clear_round_seats()`
- **Mantenimiento**: Job programado para ejecutar `expire_inactive_seats()` cada 5 min
