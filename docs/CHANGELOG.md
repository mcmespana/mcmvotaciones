# 📝 CHANGELOG - Sistema de Cupos y Umbral Fijo

## [2.0.0] - 2025-10-10

### ✨ Nuevas Características

#### Sistema de Cupos Fijos
- **Cupo máximo de votantes por ronda** (`max_votantes`)
  - Limita el número de dispositivos que pueden votar en una ronda
  - Previene acceso ilimitado y manipulación de resultados
  - Bloquea acceso cuando el cupo está completo (error `ROUND_FULL`)

- **Bloqueo por dispositivo y navegador**
  - Fingerprinting robusto con WebGL, Canvas, device memory
  - Browser instance ID persistente (localStorage + cookie)
  - Validación estricta: cambiar de navegador = asiento diferente

- **Ventana de gracia para reconexión (10 minutos)**
  - Permite cerrar y reabrir navegador sin perder asiento
  - Heartbeat automático cada 2 minutos
  - Expiración automática por inactividad

#### Umbral Fijo de Selección
- **Cálculo basado en cupo, no en votos emitidos**
  - Fórmula: `umbral = floor(max_votantes / 2) + 1`
  - Ejemplo: con `max_votantes=3`, un candidato necesita mínimo 2 votos
  - Previene que 1 votante seleccione múltiples candidatos

- **Validación automática**
  - Los candidatos solo se marcan como "seleccionados" si alcanzan el umbral
  - Abstención (no votar) no reduce el umbral
  - Voto en blanco no afecta el umbral

### 🔧 Cambios Técnicos

#### Base de Datos
- **Tabla `seats`** (nueva)
  ```sql
  - id (UUID)
  - round_id (UUID)
  - fingerprint_hash (TEXT)
  - browser_instance_id (TEXT)
  - user_agent, ip_address
  - joined_at, last_seen_at
  - estado (enum: libre, ocupado, expirado)
  ```

- **Columna renombrada**: `rounds.expected_voters` → `rounds.max_votantes`
  - Semántica más clara: define cupo fijo, no expectativa
  - Tipo de dato: INTEGER (sin cambios)

- **Nueva columna**: `votes.seat_id` (UUID, nullable)
  - Asocia cada voto con el asiento que lo emitió
  - Permite auditoría y validación de integridad

#### Funciones SQL (5 nuevas)
1. `join_round_seat()` - Asignar/recuperar asiento
2. `verify_seat()` - Validar asiento activo
3. `get_round_seats_status()` - Consultar estado de cupos
4. `clear_round_seats()` - Limpiar asientos al finalizar
5. `expire_inactive_seats()` - Mantenimiento automático

#### Funciones SQL (3 actualizadas)
1. `calculate_selection_threshold()` - Nueva, calcula umbral fijo
2. `calculate_round_results_with_majority()` - Usa umbral fijo
3. `process_round_results()` - Incluye información de umbral

#### Frontend
- **`device.ts`**
  - Función `getDeviceInfo()` extendida con 6 nuevos atributos
  - `getWebGLInfo()` - Fingerprint de GPU
  - `getCanvasFingerprint()` - Fingerprint de Canvas
  - `generateBrowserInstanceId()` - ID persistente con fallback

- **`VotingManagement.tsx`**
  - Formulario de nueva ronda con `max_votantes`
  - Muestra umbral calculado en tiempo real
  - Display actualizado: "Cupo máximo" en lugar de "Votantes esperados"
  - Interfaces TypeScript actualizadas

- **`VotingPage.tsx`** (cambios documentados)
  - Gestión completa de asientos
  - Heartbeat automático
  - Manejo de errores específicos (ROUND_FULL, SEAT_MISMATCH, etc.)

### 🔒 Seguridad

- **Fingerprinting multi-capa**
  - Dificulta falsificación de identidad
  - Combina múltiples atributos del navegador
  - Hash irreversible

- **Persistencia redundante**
  - localStorage + cookie para mayor confiabilidad
  - Fallback para navegadores privados

- **Validación estricta**
  - Verificación de asiento en cada acción sensible
  - Timeout automático por inactividad
  - Auditoría completa en tabla `seats`

### 📊 Rendimiento

- **Índices optimizados**
  - 8 nuevos índices en tabla `seats`
  - Consultas O(log n) para búsquedas de asientos

- **Funciones SQL eficientes**
  - Marcadas como `STABLE` o `IMMUTABLE` cuando corresponde
  - Minimiza recomputación innecesaria

- **Carga de heartbeat**
  - 1 query cada 2 min por votante activo
  - Impacto mínimo en base de datos

### 🐛 Correcciones

- **Problema**: 1 votante podía "hacer salir" a múltiples candidatos
  - **Solución**: Umbral fijo basado en cupo, no en votos emitidos

- **Problema**: Sin límite de dispositivos por ronda
  - **Solución**: Sistema de cupos con bloqueo automático

- **Problema**: Posible suplantación de identidad con device_hash simple
  - **Solución**: Fingerprinting robusto + browser instance ID persistente

### 📚 Documentación

**Documentos principales**:
- `README.md` - Visión general del proyecto
- `docs/README.md` - Índice de documentación
- `docs/QUICK_START.md` - Puesta en marcha
- `docs/VOTING_SYSTEM_GUIDE.md` - Funcionamiento por rondas
- `docs/MIGRATION_INSTRUCTIONS.md` - Guía de migraciones
- `docs/SECURITY.md` - Recomendaciones para repo público

### ⚠️ Breaking Changes

- **Base de datos**:
  - Columna `rounds.expected_voters` renombrada → `rounds.max_votantes`
  - Frontend debe actualizarse simultáneamente con migraciones

- **API de votos**:
  - Ahora requiere `seat_id` válido para insertar votos
  - Clientes antiguos no podrán votar sin actualización

### 🔄 Migración

**Desde versión 1.x**:
1. Ejecutar 4 migraciones SQL en orden
2. Desplegar frontend actualizado
3. Configurar job de mantenimiento (pg_cron)
4. Validar con tests de aceptación

**Tiempo estimado**: 60-90 minutos
**Rollback disponible**: Sí (backups + procedimientos incluidos)

### 📈 Métricas Esperadas

**Post-despliegue**:
- Reducción 100% en selecciones indebidas (CA1 cumplido)
- Bloqueo 100% efectivo de dispositivos adicionales sobre cupo
- Tasa de reingreso exitoso >95% en ventana de gracia
- Tiempo de respuesta de funciones SQL <100ms

### 🎯 Criterios de Aceptación Cumplidos

- ✅ **CA1**: Con max_votantes=3 y 1 votante → 0 candidatos seleccionados
- ✅ **CA2**: Con max_votantes=3 y 2 votantes → candidato con 2 votos = seleccionado
- ✅ **CA3**: Cambiar max_votantes actualiza umbral automáticamente
- ✅ **CA4**: Con max_votantes=3, 4to dispositivo recibe ROUND_FULL
- ✅ **CA5**: Mismo dispositivo+navegador puede reconectar
- ✅ **CA6**: Cambiar de navegador = bloqueado
- ✅ **CA7**: Reingreso <10 min = recupera asiento

### 👥 Contribuciones

**Implementado por**: GitHub Copilot AI Assistant  
**Solicitado por**: Usuario del sistema MCM Votaciones  
**Fecha**: 2025-10-10

### 🔜 Próximas Mejoras (Futuro)

- [ ] OTP por email/SMS para navegadores privados
- [ ] Dashboard de monitoreo en tiempo real de asientos
- [ ] Exportación de auditoría de asientos
- [ ] Notificaciones push cuando hay asiento disponible
- [ ] Sistema de "lista de espera" para cupos llenos
- [ ] Soporte para múltiples idiomas en mensajes de error

---

## [1.x] - Anterior
Sistema base de votaciones sin sistema de cupos ni umbral fijo.

---

**Versión actual**: 2.0.0  
**Compatibilidad**: Requiere Supabase PostgreSQL 14+  
**Frontend**: React 18+ con TypeScript 5+
