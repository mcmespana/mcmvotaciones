# Implementación V3 Funcional

## P0 — Alta prioridad

- ~~**#1** Papeleta fija por dispositivo en toda la votación~~
  - ~~1a: Eliminar borrado de seats en `callCloseRoom`~~
  - ~~1b: `start_new_round` no borra seats entre rondas (confirmado OK en SQL)~~
- ~~**#2** Tipos de votación configurables y personalizados~~
  - ~~2a: Fix `getMaxVotesAllowed` — fórmula `min(max_votes_per_round, remaining)`~~
  - ~~2b: Fix `computeMaxVotesThisRound` — pasa `max_votes_per_round`~~
  - ~~2c: Admin UI — inputs `max_votes_per_round` y `max_selected_candidates`~~
  - ~~2d: SQL 010 — `start_new_round` preserva config admin~~
- ~~**#3** Exclusividad de sala activa + transición con confirmación~~
  - ~~3a: Check sala activa en `callOpenRoom` antes de abrir~~
  - ~~3b: Dialog confirmación + `resolveRoomConflict`~~
- ~~**#3.1** Workflow Dirigido y Secuencial~~
  - ~~Botón dinámico `workflowActionLabel`~~
  - ~~Acciones combinadas open+start~~
  - ~~Bloqueo revisión `roundReviewState`~~
  - ~~Confirmación final + galería~~

## P1 — Media prioridad

- ~~**#4** Popup ampliado de candidato en /candidatos y votación~~
  - ~~4a: `CandidateDetailModal` con zoom de imagen~~
  - ~~4b: Long press móvil + botón info desktop en `CandidateListCard`~~
  - ~~4c: Estado modal en `GroupedCandidateList`~~
- ~~**#5** Fallback visual cuando no hay imagen de candidato~~
  - ~~5a: Color estable por hash ID en `CandidateAvatar` (azul/rojo/amarillo/verde)~~
- ~~**#5.1** Paleta oficial global de votación~~
  - ~~CSS tokens para 4 colores oficiales en global CSS~~
  - ~~Confeti con 4 colores oficiales (sin morado)~~
  - ~~Eliminado `data-accent="violet"` en admin KPI~~
- ~~**#6** Validación nombres y apellidos en UI y export~~
  - ~~6a: `VotingPage` resultados usa `formatSurname` (líneas ~1148, ~1210)~~
  - ~~6b: CSV export en `AdminVotingDetail` usa `formatCandidateName`~~

## P2 — Baja prioridad

- ~~**#7** Mitigación capturas pantalla (marca de agua dinámica + ocultar al cambiar pestaña)~~
  - ~~7a: Watermark SVG diagonal con `seatId.slice(0,8)` en `VotingPage`~~
  - ~~7b: Cover overlay fijo al detectar `visibilitychange` (pestaña oculta)~~
- ~~**#8** Revisión exportables (CSV consistente con historial por rondas)~~
  - ~~8a: Fix `en_blanco` — ahora `votes.every(v === "-")` (antes cualquier "-" = true)~~
  - ~~8b: Export disponible sin esperar `is_closed`~~
  - ~~8c: UTF-8 BOM para correcta apertura en Excel~~
- ~~**#9** Revisión resultados admin (gráficos, métricas por ronda)~~
  - ~~9a: `CHART_COLORS` sin púrpuras — 4 colores oficiales primero~~
