# Planes de diseño — MCM Votaciones

Cada plan es autocontenido: un agente ejecutor no necesita ningún contexto de la
conversación. **Ejecutor:** lee `../design.md` primero, después el plan entero, haz solo lo
que dice, ejecuta su sección Validación, y actualiza tu fila de estado aquí al terminar. Si
un paso no cuadra con el código actual, PARA, marca BLOCKED con una línea de motivo, y no
improvises.

Estos planes son la **unificación con el sistema de diseño MCM** (`../design.md`), común a
`mcmbank`, `mcmrecursos`, `mcmshop` y `mcmvotaciones`.

**Estado a 2026-09-04:** hechos el `001`, el `005` y el `006`; el `002` hasta donde llegaba sin
tomar decisiones de diseño nuevas. Quedan el **`004`** (tipografías, y su plan **exige visto
bueno humano antes de ejecutarlo**), el **`008`** que sale del `002` (la paleta categórica que
le falta al sistema) y cerrar el **`007`**, que necesita credenciales de Supabase.

> **Lo primero de todo ya está hecho, y no era lo que creíamos.** Al abrir el `001` resultó
> que `tailwind.config.ts` **no se estaba cargando**: `src/index.css` usa Tailwind 4
> (`@import "tailwindcss"`) sin `@config`, así que ninguna de las clases de color del config
> existía en el CSS compilado. Medido sobre el build: **334 usos de 62 clases distintas**
> —`text-muted-foreground` 45 veces, `border-outline-variant` 34, `text-foreground` 23…—
> heredaban el color del padre en vez de aplicar el suyo. No parecía un fallo porque el CSS
> propio en `.avd-*` sí funciona y sostiene el cromo, pero la jerarquía de texto estaba
> plana. Arreglado con un bloque `@theme` nativo de v4 (2026-09-02): 334 → 0.
>
> Consecuencia para lo que queda: **cualquier plan que toque color tiene que comprobar el
> CSS compilado, no solo el código fuente.** Y al medir, ojo: el minificador fusiona
> selectores (`.text-foreground,.text-foreground\/50{…}`), así que buscar `.clase{` da
> falsos negativos.
`001` es el que desbloquea de verdad todo lo demás y conviene hacerlo solo, en su propio
commit. Antes de tocar nada, consulta `graphify-out/` (`/graphify query "..."`) y actualiza
el grafo al terminar (`/graphify . --update`).

## Estado

| Plan | Título | Superficie | Estado |
|------|--------|------------|--------|
| [001](001-un-solo-sistema-de-color.md) | Un solo sistema de color: `--avd-*` como fuente, semánticos como alias | global | DONE (2026-09-04) — falta mirarlo en uso, ver `007` |
| [002](002-hex-a-tokens.md) | Los 54 hex a pelo de `src/**/*.tsx` → tokens | voting, projection, admin | PARCIAL (2026-09-04) — 54 → 33; los 33 que quedan piden una paleta categórica que el sistema no tiene (`008`) |
| [003](003-quitar-glow-y-sombras-de-color.md) | Quitar `--primary-glow`, `--shadow-primary/accent` y `animate-pulse-glow` | global | DONE (2026-09-02) — estaban muertas: apuntaban a variables que no existían |
| [004](004-tipografias-autoalojadas.md) | Cuatro familias por CDN → dos autoalojadas + JetBrains Mono | global | TODO — **requiere visto bueno humano**, no ejecutado |
| [005](005-vision-plus-sin-important.md) | Reescribir Visión+ escalando la raíz, sin 408 líneas de `!important` | votante | DONE (2026-09-04) — 408 → 56 líneas, cero `!important`. Y el fichero **no llegaba al CSS compilado** |
| [006](006-recharts-v3.md) | Subir Recharts a `^3` para igualar con MCM Bank | admin | DONE (2026-09-04) |
| [007](007-verificar-en-uso-el-theme.md) | **Mirar en uso** el efecto del `@theme`: encendió 334 aplicaciones de color que nadie ha visto todavía | votante, proyección, admin | PARCIAL (2026-09-04) — mirado lo que monta `/test`; proyección, votante completo y admin siguen sin credenciales |
| [008](008-paleta-categorica.md) | La paleta categórica que le falta al sistema (y el modo oscuro roto de los avatares) | votante, admin | TODO |

Estados: TODO | IN PROGRESS | DONE (fecha) | BLOCKED (motivo en una línea)
