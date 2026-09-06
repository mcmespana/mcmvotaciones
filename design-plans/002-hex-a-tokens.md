# 002 · Los hex a pelo → tokens

**Superficie:** voting, projection, admin · **Riesgo:** medio · **Depende de:** `001`

## Contexto

```bash
grep -rho "#[0-9a-fA-F]\{6\}\b" src --include=*.tsx | wc -l   # 54
```

Repartidos por `admin/ResultsAnalytics.tsx`, `projection/ProjectionBallotAnimation.tsx`,
`projection/ProjectionWaiting.tsx`, `voting/CandidateAvatar.tsx`,
`voting/CandidateDetailModal.tsx`, `voting/VotingTutorial.tsx`,
`voting/GroupedCandidateList.tsx`, `voting/VoteSubmitAnimation.tsx`,
`pages/PublicCandidates.tsx` y `pages/VotingPage.tsx`. Más los `rgba()` de
`components/ui/button.tsx`, `select.tsx` y `projection/projection.css`.

Un hex no tiene variante oscura, así que cada uno es un sitio donde el modo oscuro está roto
o a punto de estarlo (`design.md` §3.1, `CLAUDE.md` regla 2).

## Qué hacer

Fichero a fichero, en este orden (de más visible a menos): `voting/` → `projection/` →
`pages/` → `admin/`.

Para cada hex, decidir **qué significa** y sustituir por el token correspondiente:

- Fondo de superficie → `var(--avd-surface)` / `var(--avd-bg-elev)`
- Texto → `var(--avd-fg)` / `--avd-fg-muted` / `--avd-fg-subtle`
- Borde → `var(--avd-border)` / `--avd-border-soft` / `--avd-border-strong`
- Acción o marca → `var(--avd-brand)`
- Estado → `--avd-ok` / `--avd-warn` / `--avd-bad` (y sus `-bg`/`-fg`)
- **Color de una opción de voto** → `hsl(var(--vote-color-*))`, **no** un token de cromo
- Opacidad → `color-mix(in oklch, var(--token) N%, transparent)`, no un `rgba()` nuevo

**Si un hex no encaja en ninguna categoría**, no lo fuerces: anótalo al pie de este plan con
fichero y línea, y sigue. Casi seguro es un color que hace falta añadir al sistema, y eso es
una decisión, no un reemplazo.

**Excepción**: los colores de un logo o de un icono de marca se quedan escritos a mano (§3.1).
Compruébalo antes de tocar un SVG.

## Qué NO tocar

`graphify-out/graph.html` (siempre oscuro, fuera del sistema). Los colores dentro de
`--vote-color-*` en `index.css`: son la definición, no un uso.

## Validación

```bash
npm run build
grep -rn "#[0-9a-fA-F]\{6\}\b" src --include=*.tsx    # solo logos, con comentario
```
Recorrer en claro y oscuro: voto, tutorial, detalle de candidato, animación de envío,
proyección (espera y papeleta) y analíticas de resultados. Actualizar el grafo:
`/graphify . --update`.

---

## Ejecución (2026-09-04)

**54 → 33 hex.** Los 21 que se han sustituido eran los que sí tenían significado dentro del
sistema; los 33 que quedan son dos decisiones de diseño sin tomar, anotadas abajo tal y como
pide este plan.

Además se ha creado `src/lib/voteColors.ts`: `--vote-color-*` es la fuente, `VOTE_COLOR_CSS`
sirve para CSS y `resolveVoteColors()` los resuelve a color literal para `canvas-confetti`,
que pinta en canvas y **no entiende `var()`**. Sin eso el confeti salía del color por
defecto de la librería.

Sustituido:

| Fichero | Qué era | Qué es |
|---|---|---|
| `voting/CandidateAvatar.tsx` | 4 hex + `#fff` | `hsl(var(--vote-color-*))` + `--avd-n-0` |
| `voting/VoteSubmitAnimation.tsx` | 4 hex, 3 `glow`, 3 `topBar`, 1 velo `rgba` | tokens de voto + `color-mix` |
| `voting/VotingTutorial.tsx` | 4 de 5 hex + 4 de 5 `topBar` | tokens de voto + `color-mix` |
| `voting/CandidateDetailModal.tsx` | `bg-white`, `#1a1a1a`, 3 sombras `rgba` | `--avd-n-0` / `--avd-n-900` / `--avd-shadow-*` |
| `voting/GroupedCandidateList.tsx` | `var(--tkt-yellow, …)` | se quita `--tkt-yellow`: **no existe en ninguna parte**, el respaldo era lo único que pintaba |
| `projection/ProjectionBallotAnimation.tsx` | 4 hex de confeti | `resolveVoteColors()` |
| `projection/ProjectionWaiting.tsx` | QR `#ffffff` / `#0f172a` | `--avd-n-0` / `--avd-n-950` (rampa cruda: el QR no debe cambiar con el tema o deja de escanearse) |
| `projection/projection.css` | 3 sombras `rgba` | `color-mix` sobre `--avd-n-1000` |
| `pages/VotingPage.tsx` | caja de éxito `#d1fae5`/`#6ee7b7`/`#059669` + 1 sombra | `--avd-ok-bg` / `--avd-ok` / `--avd-ok-fg` |
| `admin/ResultsAnalytics.tsx` | `#10B981` de «electo» | `var(--avd-ok)` |
| `ui/button.tsx`, `ui/select.tsx` | 5 sombras `rgba`, **4 de ellas de color** | `--avd-shadow-xs/sm`. Las de color son las que el `003` retiró del resto y aquí habían sobrevivido |

## Lo que NO se ha sustituido, y por qué

Los tres casos siguen en hex **a propósito**, con comentario en el código:

1. **Ámbar de «favorito»** — `voting/VotingTutorial.tsx:27,29` y
   `voting/GroupedCandidateList.tsx:296` (`#f59e0b`). Es la estrella de favoritos. No es un
   estado (`--avd-warn` es ámbar pero significa «aviso», y §3.1 prohíbe reciclar semánticos),
   no es marca y no es un color de voto. Hace falta un token propio.
2. **Paleta categórica de serie** — `admin/ResultsAnalytics.tsx:48-56` (12 hex). `design.md`
   §3.9 pide «paleta categórica validada» y el sistema no tiene ninguna.
3. **Paleta categórica de identidad** — `pages/PublicCandidates.tsx:55-56` (16 hex). Colores
   de avatar por inicial, más una versión clara de fondo **que no tiene variante oscura**:
   hoy el modo oscuro de esa pantalla está roto y seguirá roto hasta que se decida.

Los tres son el mismo agujero: **al sistema le falta una rampa categórica `--avd-cat-*`** en
OKLCH, con luminosidades comprobadas para claro y oscuro, y probablemente un token de acento
para «favorito». Eso es un plan nuevo (`008`), no un reemplazo dentro de este.

Nota aparte: `projection/projection.css:1-21` define `--proj-red/emerald/yellow/blue` con sus
escalones `-50`/`-600`, que **duplican la paleta de voto** con tonos ligeramente distintos
(`--proj-emerald` es `#10b981`, hue 160; `--vote-color-green` es hue 142). No se ha tocado:
es un bloque de definición, igual que `--vote-color-*`, y unificarlo mueve el color de la
proyección, que es la superficie que se ve a diez metros. También para el `008`.
