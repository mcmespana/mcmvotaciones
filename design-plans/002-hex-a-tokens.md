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
