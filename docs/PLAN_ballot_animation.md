# Plan: Animación de papeletas → urna → resultados

> Rama: `claude/pedantic-elgamal-12b348`  
> Estado: **✅ implementado** — commit `9860420`

## Contexto

El workflow post-ronda ahora muestra **primero** una animación de papeletas entrando en una
urna (una a una, framer-motion) y **después** pasa automáticamente a la proyección de resultados.

La rejilla de papeletas (`show_ballot_summary_projection`) se **conserva** comentada (fácil de reactivar).

---

## Fases

### Fase 1 — Base de datos

- [x] Crear migración `supabase/migrations/20260516000000_ballot_animation_flag.sql`
  - `show_ballot_animation boolean NOT NULL DEFAULT false`
  - `ballot_animation_started_at timestamptz` (para resumir si la proyección se recarga)
- [x] Aplicar migración vía Supabase MCP

### Fase 2 — Tipos TS

- [x] Añadir `show_ballot_animation` y `ballot_animation_started_at` al tipo `RoundRow` en `src/types/db.ts`

### Fase 3 — Hook de proyección (`useProjectionData.ts`)

Archivo: `src/hooks/useProjectionData.ts`

- [x] Añadir estado `"ballot-animation"` al tipo `ProjectionState`
- [x] Insertar la condición **antes** que `"results"` en el switch de estado
- [x] Cargar `ballotSummaries` también cuando `show_ballot_animation` es true
- [x] Añadir `show_ballot_animation` a `hasAnythingToProject`

### Fase 4 — Workflow hook (`useRoundWorkflow.ts`)

Archivo: `src/hooks/useRoundWorkflow.ts`

- [x] Añadir paso `"ballot-animation"` a `WORKFLOW_STEPS` (entre `close-vote` y `results`)
- [x] Reordenar los stages:
  - stage 3 → listo para lanzar animación
  - stage 4 → animación en curso (`show_ballot_animation = true`)
  - stage 5 → mostrando resultados
- [x] Actualizar la lógica de `label` y `disabled` (botón principal bloqueado durante animación)
- [x] Añadir `show_ballot_animation` al tipo `Round` interno del hook

### Fase 5 — Acciones admin (`useRoundActions.ts`)

Archivo: `src/components/admin/voting-detail/hooks/useRoundActions.ts`

- [x] Insertar nuevo primer paso post-finalización: activa animación + `ballot_animation_started_at`
- [x] `calcAnimationDuration(n)`: adaptativo 700→400 ms/papeleta + 2 s buffer
- [x] `scheduleAutoAdvance(ms)`: `setTimeout` en `useRef`, cancelable
- [x] `useEffect` de recuperación: si la página recarga con animación activa, retoma el timer
- [x] `skipBallotAnimation()`: cancela timer, avanza a resultados inmediatamente
- [x] Comentar (no borrar) el bloque de `show_ballot_summary_projection`
- [x] Reset de `show_ballot_animation` en `finalizeRound`, `startNextRound`, `closeVoting`
- [x] Exportar `skipBallotAnimation` desde el hook

### Fase 6 — Componente de animación (`ProjectionBallotAnimation.tsx`)

Nuevo archivo: `src/components/projection/ProjectionBallotAnimation.tsx`

- [x] Props: `ballotSummaries`, `roundTitle`, `roundNumber`, `team`, `startedAt?`
- [x] Layout: header + stage (papeleta) + urna SVG + barra de progreso
- [x] Urna SVG: cuerpo, ranura, candado, patas, glow al recibir papeleta
- [x] Papeleta (tarjeta oscura): `voteCode` en mono, 3 nombres, sello EN BLANCO diagonal
- [x] Pila de "shadow cards" apiladas detrás con rotación y opacidad decreciente
- [x] Estado "done" con ✓ animado y texto "Cargando resultados…"
- [x] `entry` (200 ms): desde `y:-140`, `scale 0.82→1`, `opacity 0→1`
- [x] `hold`: nombres con `staggerChildren` 60 ms vía framer-motion variants
- [x] `drop` (260 ms): `y:200`, `scale→0.38`, `opacity→0`
- [x] Pulse de la ranura al recibir: `urna-glow` CSS keyframe
- [x] Shuffle con seed determinista (mulberry32 derivado de `roundTitle+roundNumber`)
- [x] Resume-on-reload: `startedAt` → calcula offset → arranca desde la papeleta correcta
- [x] Auto-avance lo maneja el admin (Supabase listener → cambia estado a `"results"`)

### Fase 7 — Página de proyección (`ProjectionPage.tsx`)

- [x] Importar `ProjectionBallotAnimation`
- [x] Añadir case `"ballot-animation"` pasando `startedAt={data.round.ballot_animation_started_at}`

### Fase 8 — Admin UI (`PageHeader.tsx` + `index.tsx`)

- [x] Nueva prop `skipBallotAnimation?` en `PageHeader`
- [x] Botón "Saltar a resultados →" (con icono `FastForward`) visible solo en `stage === 4`
- [x] Conectar `skipBallotAnimation` en `index.tsx` → `PageHeader`
- [x] El stepper ya refleja el nuevo paso automáticamente (lee `WORKFLOW_STEPS`)

---

## Decisiones fijadas

| # | Decisión |
|---|---------|
| 1 | Rejilla de papeletas conservada pero **comentada** (fácil de reactivar) |
| 2 | Duración **adaptativa**: 700 ms base, baja linealmente hasta 400 ms a partir de >10 papeletas |
| 3 | Botón "Saltar a resultados →" siempre disponible durante la animación (stage 4) |
| 4 | Animación con **framer-motion** `^12.38.0` |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260516000000_ballot_animation_flag.sql` | Nuevo |
| `src/types/db.ts` | +2 campos |
| `src/hooks/useProjectionData.ts` | Estado `"ballot-animation"`, carga ballots |
| `src/hooks/useRoundWorkflow.ts` | Nuevo paso, stages reordenados |
| `src/components/admin/voting-detail/hooks/useRoundActions.ts` | Timer, auto-avance, skip |
| `src/components/projection/ProjectionBallotAnimation.tsx` | **Nuevo** (280 líneas) |
| `src/components/projection/projection.css` | ~160 líneas nuevas de estilos |
| `src/pages/ProjectionPage.tsx` | Case `"ballot-animation"` |
| `src/components/admin/voting-detail/PageHeader.tsx` | Prop + botón skip |
| `src/components/admin/voting-detail/index.tsx` | Conecta `skipBallotAnimation` |
