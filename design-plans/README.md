# Planes de diseño — MCM Votaciones

Cada plan es autocontenido: un agente ejecutor no necesita ningún contexto de la
conversación. **Ejecutor:** lee `../design.md` primero, después el plan entero, haz solo lo
que dice, ejecuta su sección Validación, y actualiza tu fila de estado aquí al terminar. Si
un paso no cuadra con el código actual, PARA, marca BLOCKED con una línea de motivo, y no
improvises.

Estos planes son la **unificación con el sistema de diseño MCM** (`../design.md`), común a
`mcmbank`, `mcmrecursos`, `mcmshop` y `mcmvotaciones`.

**Orden recomendado:** `003` → `001` → `002` → `006` → `004` → `005`.
`001` es el que desbloquea de verdad todo lo demás y conviene hacerlo solo, en su propio
commit. Antes de tocar nada, consulta `graphify-out/` (`/graphify query "..."`) y actualiza
el grafo al terminar (`/graphify . --update`).

## Estado

| Plan | Título | Superficie | Estado |
|------|--------|------------|--------|
| [001](001-un-solo-sistema-de-color.md) | Un solo sistema de color: `--avd-*` como fuente, semánticos como alias | global | TODO |
| [002](002-hex-a-tokens.md) | Los 54 hex a pelo de `src/**/*.tsx` → tokens | voting, projection, admin | TODO |
| [003](003-quitar-glow-y-sombras-de-color.md) | Quitar `--primary-glow`, `--shadow-primary/accent` y `animate-pulse-glow` | global | TODO |
| [004](004-tipografias-autoalojadas.md) | Cuatro familias por CDN → dos autoalojadas + JetBrains Mono | global | TODO |
| [005](005-vision-plus-sin-important.md) | Reescribir Visión+ escalando la raíz, sin 408 líneas de `!important` | votante | TODO |
| [006](006-recharts-v3.md) | Subir Recharts a `^3` para igualar con MCM Bank | admin | TODO |

Estados: TODO | IN PROGRESS | DONE (fecha) | BLOCKED (motivo en una línea)
