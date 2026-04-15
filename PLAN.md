## Plan V2: Rediseño Admin por Votación + Sala Previa + Auditoría de Papeletas

### Seguimiento de ejecución (actualizado 2026-04-15)
- [x] Admin simplificado a `Dashboard`, `Votaciones` y `Usuarios`.
- [x] Flujo lista->detalle implementado con ruta `/admin/votaciones/:roundId`.
- [x] Pantalla de detalle por votación con bloques de `Resumen`, `Monitoreo`, `Análisis`, `Papeletas` y `Configuración`.
- [x] Exportación CSV por papeleta en votaciones cerradas (desde detalle).
- [x] Toggle admin `show_ballot_summary_projection` y panel en `/proyeccion` para ronda actual.
- [x] Integración frontend de asientos en votante: `join_round_seat` + `verify_seat` + persistencia local de `seat_id` y `browser_instance_id`.
- [x] Asociación de `seat_id` al insertar votos en `votes`.
- [x] Conteo/estado de asientos en admin (ocupados/disponibles/expirados).
- [x] Base de datos actualizada con columnas `is_voting_open`, `join_locked`, `show_ballot_summary_projection` (migración aplicada por MCP Supabase).
- [x] RPC actualizado: `join_round_seat` bloquea nuevas altas con `join_locked=true` y permite reingreso.
- [x] RPC añadido para ciclo de vida: `open_round_room` y `start_voting_round` con validaciones de candidatos/conectados/censo.
- [x] QA de codificación mojibake (`Gestión`, etc.) completado en módulos activos de admin/votante/proyección/login.
- [x] Pantalla votante post-voto (`código + 3 votos`) con persistencia explícita del resumen por `round_id + round_number` en UI post-recarga.
- [ ] Barrido de pruebas funcionales end-to-end del flujo completo en entorno real.

### Resumen
- Reestructurar el admin para que el menú principal tenga solo `Dashboard`, `Votaciones` y `Usuarios`.
- `Votaciones` será una lista; cada elemento abrirá una pantalla propia de detalle (`/admin/votaciones/:roundId`) con monitorización, candidatos, análisis y papeletas dentro de esa votación.
- Añadir estado intermedio de “sala abierta” antes de iniciar ronda, con control de conectados por asientos (`seats`) y bloqueo de nuevas entradas al iniciar.
- Añadir exportación CSV por votación cerrada, agrupada por papeleta.
- Añadir en `/proyeccion` un toggle para mini resumen de papeletas (ronda actual).
- Corregir todos los textos con codificación rota (`Gestión`, etc.) en el panel y pantallas relacionadas.

### Cambios de implementación
- **Navegación Admin**
  - Simplificar `AdminDashboard` a tres pestañas: `dashboard`, `votaciones`, `usuarios`.
  - Sustituir la gestión actual “mixta” por flujo lista→detalle: desde la lista, botón `Gestionar` abre `/admin/votaciones/:roundId`.
  - En detalle de votación, diseño más claro por bloques: `Resumen/Estado`, `Candidatos` (siempre visibles, sin botón “ver candidatos”), `Monitoreo`, `Análisis`, `Papeletas`, `Configuración`.

- **Ciclo de vida de votación (nuevo paso intermedio)**
  - Estados funcionales:
    1. `Creada`: no activa.
    2. `Sala abierta`: admite uniones, no admite voto.
    3. `Ronda en curso`: voto abierto, nuevas uniones bloqueadas.
    4. `Ronda finalizada`: resultados y transición.
    5. `Votación cerrada`.
  - Regla de inicio confirmada:
    - `census_mode=exact`: iniciar solo con `conectados == max_votantes`.
    - `census_mode=maximum`: inicio manual del admin.
  - Política de reingreso confirmada:
    - Tras iniciar, solo reingreso de navegador/asiento ya registrado; dispositivos nuevos bloqueados.
  - Validaciones de inicio:
    - Al menos 1 candidato no eliminado.
    - En modo `maximum`, mínimo 1 conectado para habilitar inicio.

- **Integración real de asientos (`seats`)**
  - Conectar frontend de votante a `join_round_seat` y `verify_seat` (hoy no se usan).
  - Persistir `seat_id` y `browser_instance_id` para reingreso entre rondas en el mismo navegador.
  - Asociar votos al `seat_id` cuando se inserta en `votes`.
  - Mostrar en admin conteo y estado de asientos (ocupados/libres/expirados).

- **Pantalla votante post-voto**
  - Mantener tras enviar: `código de papeleta + 3 votos emitidos` (rellenando con `-` si hay menos).
  - Persistencia local por `round_id + round_number` para que no se pierda al recargar.
  - Mantener política actual de resultados: no mostrar resultados al votante salvo cuando admin los publique.

- **Proyección**
  - Nuevo switch admin: `Mostrar resumen de papeletas`.
  - En `/proyeccion`, durante ronda actual, panel resumido por papeleta:
    - código corto de papeleta,
    - voto 1, voto 2, voto 3 (`-` en blanco),
    - solo votos válidos (`is_invalidated=false`).

- **Exportación de papeletas**
  - Disponible solo en votaciones cerradas.
  - Exportación CSV agrupada por papeleta (no por voto individual).
  - Una fila por papeleta y ronda, con columnas: `votacion`, `ronda`, `codigo_papeleta`, `voto_1`, `voto_2`, `voto_3`, `en_blanco`, `timestamp`, `estado`.
  - Descarga desde la vista de detalle de esa votación.

- **Corrección de acentos/codificación**
  - Revisión y sustitución sistemática de cadenas mojibake en admin/votación/proyección/login.
  - Verificación visual de UI en español (UTF-8 correcto).

### Cambios en APIs/interfaces/tipos públicos
- **Base de datos (rounds)**
  - Añadir:
    - `is_voting_open BOOLEAN NOT NULL DEFAULT false`
    - `join_locked BOOLEAN NOT NULL DEFAULT false`
    - `show_ballot_summary_projection BOOLEAN NOT NULL DEFAULT false`
- **RPC / SQL**
  - Ajustar `join_round_seat` para rechazar nuevas altas cuando `join_locked=true` y permitir solo reingreso existente.
  - Añadir RPC transaccional para iniciar ronda (aplica validaciones y bloquea entradas).
- **Tipos TS**
  - Extender `Round` en frontend con `is_voting_open`, `join_locked`, `show_ballot_summary_projection`.
  - Extender payload de papeleta resumida para proyección y CSV de exportación.

### Plan de pruebas
- Flujo admin: menú reducido, lista de votaciones y navegación a detalle por ID.
- Flujo sala previa:
  - Abrir sala y ver conectados en tiempo real.
  - Modo exacto: no iniciar hasta cupo completo.
  - Modo máximo: inicio manual permitido.
- Bloqueo de entrada:
  - Dispositivo nuevo bloqueado tras inicio.
  - Mismo navegador/asiento reingresa correctamente.
- Votante:
  - Envío de papeleta y persistencia de `código + 3 votos` tras recarga.
  - No se muestran resultados si no están publicados.
- Proyección:
  - Toggle de resumen funciona en ronda actual y actualiza en tiempo real.
- Exportación:
  - CSV solo en votación cerrada y agrupado por papeleta.
- QA de texto:
  - Sin cadenas `Ã`, `Â` ni caracteres corruptos en vistas principales.

### Suposiciones y defaults cerrados
- `Usuarios` sigue visible solo para super admin (comportamiento actual).
- “Quién está conectado y quién no” se representa por asientos (ocupado/libre), no por identidad nominal.
- El código visible de papeleta para cotejo será el código corto derivado del `vote_hash` existente.
- Este plan reemplaza el foco del `implementation_plan.md` actual para la siguiente fase (nuevo bloque/fase de rediseño admin y operación de sala).
