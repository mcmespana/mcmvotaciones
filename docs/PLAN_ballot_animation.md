# Plan: Animación de papeletas → urna → resultados

> Rama: `claude/redo-ballot-animation`  
> Estado: en planificación

## Contexto

El workflow post-ronda actual muestra primero los resultados y luego la rejilla de papeletas.
Queremos invertirlo: **primero** se ve una animación de papeletas entrando en una urna (una a una,
framer-motion), y **después** se pasa automáticamente a la proyección de resultados ya existente.

La rejilla de papeletas (`show_ballot_summary_projection`) se **conserva** como paso posterior opcional
(código comentado, listo para reactivar).

---

## Fases

### Fase 1 — Base de datos

- [ ] Crear migración `supabase/migrations/YYYYMMDDHHMMSS_ballot_animation_flag.sql`
  - `show_ballot_animation boolean NOT NULL DEFAULT false`
  - `ballot_animation_started_at timestamptz` (para resumir si la proyección se recarga)
- [ ] Aplicar migración vía Supabase MCP

### Fase 2 — Tipos TS

- [ ] Añadir `show_ballot_animation` y `ballot_animation_started_at` al tipo `RoundRow` en `src/types/db.ts`

### Fase 3 — Hook de proyección (`useProjectionData.ts`)

Archivo: `src/hooks/useProjectionData.ts:51`

- [ ] Añadir estado `"ballot-animation"` al tipo `ProjectionState`
- [ ] Insertar la condición **antes** que `"results"` en el switch de estado:
  ```ts
  if (round.round_finalized && round.show_ballot_animation) return "ballot-animation";
  if (round.round_finalized && round.show_results_to_voters) return "results";
  ```
- [ ] Añadir `show_ballot_animation` al `Pick<RoundRow, …>` que usa el hook

### Fase 4 — Workflow hook (`useRoundWorkflow.ts`)

Archivo: `src/hooks/useRoundWorkflow.ts`

- [ ] Añadir paso `"ballot-animation"` a `WORKFLOW_STEPS` (entre `close-vote` y `results`):
  ```ts
  { id: "ballot-animation", label: "Animación de papeletas", sub: "Papeletas entrando en urna" },
  ```
- [ ] Reordenar los stages (añadir stage intermedio):
  - stage 3 → `show_ballot_animation = true` (nuevo)
  - stage 4 → `show_results_to_voters = true` (era stage 3)
  - stage 5 → `show_ballot_summary_projection` (era stage 4, **comentado**)
  - stage 6 → Finalizar ronda (era stage 5)
- [ ] Actualizar la lógica de `label` y `disabled` para el nuevo estado
- [ ] Añadir `show_ballot_animation` al tipo `Round` interno del hook

### Fase 5 — Acciones admin (`useRoundActions.ts`)

Archivo: `src/components/admin/voting-detail/hooks/useRoundActions.ts:183`

- [ ] En `runProjectionWorkflowStep()`, insertar el nuevo primer paso post-finalización:
  ```ts
  if (!round.show_ballot_animation) {
    // Calcula duración total y agenda auto-avance a resultados
    const totalMs = calcAnimationDuration(ballotCount) + 2000; // buffer 2 s
    await supabase.from("rounds").update({
      show_ballot_animation: true,
      ballot_animation_started_at: new Date().toISOString(),
    }).eq("id", roundId);
    scheduleAutoAdvanceToResults(roundId, totalMs);
    return;
  }
  ```
- [ ] Mover el bloque `show_results_to_voters` al siguiente paso (ya existente, reubicarlo)
- [ ] Comentar (no borrar) el bloque de `show_ballot_summary_projection`:
  ```ts
  // -- Papeletas estáticas (paso opcional, desactivado temporalmente) --
  // if (!round.show_ballot_summary_projection) { ... }
  ```
- [ ] Implementar `calcAnimationDuration(n: number): number`:
  - Base: 700 ms/papeleta, mínimo 400 ms si hay >30 papeletas, proporcional hasta 1 000
  - Fórmula sugerida: `Math.max(400, Math.min(700, 700 - (n - 10) * 10))` ms
- [ ] Implementar `scheduleAutoAdvanceToResults(roundId, ms)`:
  - `setTimeout` que actualiza `show_ballot_animation = false, show_results_to_voters = true`
  - Guardar la referencia en un `ref` para poder cancelarla si el admin salta manualmente
- [ ] Añadir botón "Saltar animación" visible cuando `round.show_ballot_animation`:
  - Cancela el timeout, hace el update a resultados inmediatamente
  - Texto: "Saltar a resultados →"

### Fase 6 — Componente de animación (`ProjectionBallotAnimation.tsx`)

Nuevo archivo: `src/components/projection/ProjectionBallotAnimation.tsx`

#### Props
```ts
interface Props {
  ballotSummaries: BallotSummary[];
  roundTitle: string;
  roundNumber: number;
  team: string;
  startedAt?: string | null; // para resumir si se recarga
}
```

#### Estructura visual
- [ ] Layout: urna SVG centrada en la parte inferior, papeleta activa en el centro superior
- [ ] Urna SVG: caja con ranura, color `--avd-surface`, borde `--avd-border`, glow `--avd-brand` al recibir papeleta
- [ ] Papeleta (tarjeta ~480×320 px oscura):
  - Cabecera: `voteCode` en monospace
  - 3 líneas de nombres, fuente grande legible
  - Sello "EN BLANCO" diagonal si `isBlank`
  - Borde y fondo con tokens `--avd-*`
- [ ] Contador "X / N papeletas" + barra de progreso (`--avd-brand`)
- [ ] Pila de papeletas apiladas detrás de la activa (efecto baraja, `z-index`)

#### Animación framer-motion por papeleta
- [ ] `entry` (200 ms): desde arriba (`y: -120`), `rotate` aleatorio [-3°, 3°], `scale 0.8→1`, `opacity 0→1`
- [ ] `hold` (variable): los 3 nombres con `staggerChildren` 60 ms (fade-in)
- [ ] `drop` (250 ms): `y → urna`, `scale 1→0.4`, `rotate→0`, `opacity→0`
- [ ] Pulse en la urna al recibir: `AnimatePresence` + `boxShadow` de `--avd-brand`

#### Lógica de secuencia
- [ ] Barajar papeletas con seed determinista (derivado de `roundId`) → misma secuencia en todas las pantallas
- [ ] `useEffect` encadenado con `setTimeout` (igual que `ProjectionResults`)
- [ ] Si `startedAt` está presente: calcular offset y arrancar desde la papeleta correcta (skip silencioso)
- [ ] Al terminar la última papeleta: pausa 1,5 s → fundido negro suave → el estado cambia a `"results"` (por el Supabase listener, no hace falta que el componente llame nada)

#### CSS
- [ ] Añadir keyframes en `src/components/projection/projection.css`:
  - `urna-glow` para el pulse de la ranura
  - `ballot-stack-shift` para que la pila se mueva levemente al entrar cada papeleta
- [ ] Modo oscuro únicamente (componente de proyección = siempre-oscuro, exento de la regla doble-modo)

### Fase 7 — Página de proyección (`ProjectionPage.tsx`)

Archivo: `src/pages/ProjectionPage.tsx`

- [ ] Importar `ProjectionBallotAnimation`
- [ ] Añadir case `"ballot-animation"` en el switch/render:
  ```tsx
  {data.state === "ballot-animation" && (
    <ProjectionBallotAnimation
      ballotSummaries={data.ballotSummaries}
      roundTitle={data.round.title}
      roundNumber={data.round.current_round_number}
      team={data.round.team}
      startedAt={data.round.ballot_animation_started_at}
    />
  )}
  ```

### Fase 8 — Admin UI (`PageHeader.tsx` y panel de ronda)

Archivo: `src/components/admin/voting-detail/PageHeader.tsx:137`

- [ ] Actualizar el indicador visual de pasos (stepper) para reflejar el nuevo paso "Animación papeletas"
- [ ] Añadir botón "Saltar a resultados →" visible solo cuando `workflow.stage === 3` (animación activa)
  - Estilo: outline/secundario, no el botón principal del workflow
  - Llama a `skipBallotAnimation()` de `useRoundActions`

---

## Decisiones fijadas

| # | Decisión |
|---|---------|
| 1 | Rejilla de papeletas conservada pero **comentada** (fácil de reactivar) |
| 2 | Duración **adaptativa**: 700 ms base, baja linealmente hasta 400 ms a partir de >10 papeletas |
| 3 | Botón "Saltar a resultados →" siempre disponible durante la animación |
| 4 | Animación con **framer-motion** (ya instalado `^12.38.0`) |

---

## Archivos a tocar (resumen)

| Archivo | Tipo de cambio |
|---------|---------------|
| `supabase/migrations/…_ballot_animation_flag.sql` | Nuevo |
| `src/types/db.ts` | Añadir campos |
| `src/hooks/useProjectionData.ts` | Añadir estado `"ballot-animation"` |
| `src/hooks/useRoundWorkflow.ts` | Nuevo paso, reordenar stages |
| `src/components/admin/voting-detail/hooks/useRoundActions.ts` | Reordenar workflow, auto-avance, skip |
| `src/components/projection/ProjectionBallotAnimation.tsx` | **Nuevo** |
| `src/components/projection/projection.css` | Nuevos keyframes |
| `src/pages/ProjectionPage.tsx` | Añadir case nuevo estado |
| `src/components/admin/voting-detail/PageHeader.tsx` | Stepper + botón skip |
