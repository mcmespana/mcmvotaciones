# 001 · Un solo sistema de color

**Superficie:** global · **Riesgo:** alto · **Depende de:** `003` (recomendado antes)

## Contexto

`src/index.css` (1.983 líneas) contiene **dos sistemas de color vivos a la vez**:

1. **Legado *Soft Oceanic***: tokens HSL estilo shadcn (`--background`, `--primary`,
   `--surface`, `--surface-container-*`, `--primary-container`, `--primary-fixed`…), más
   `--gradient-primary`, `--gradient-secondary`, `--gradient-tech`, `--gradient-canvas`
   (que además pinta un degradado de fondo en el `body`) y los `--*-glow`.
2. **Actual *Consolación Design System***: `--avd-*` en OKLCH, con rampa cruda
   (`--avd-brand-50…900`, `--avd-n-0…1000`, `--avd-ok/warn/bad-*`) y capa aplicada
   (`--avd-bg`, `--avd-surface`, `--avd-fg`, `--avd-border`, `--avd-brand`, sombras, radios).

`CLAUDE.md` manda usar solo `--avd-*`. La realidad: **43 de los 91 `.tsx`** los usan. El
resto tira del legado o de hex sueltos. `design.md` §5.14: dos sistemas de tokens vivos en un
repo es peor que cualquiera de los dos estados.

`--avd-*` cumple `design.md` §3.1 (OKLCH, rampa cruda + capa semántica) y el legado no. Se
queda `--avd-*`.

## Qué hacer

**No se trata de borrar el legado de golpe** — los componentes de `src/components/ui/`
(shadcn) esperan los nombres semánticos. El camino es hacer que esos nombres **salgan de la
rampa `--avd-*`** y luego borrar lo que sobre.

1. **Alias.** En `:root` y en `.dark`, redefinir los tokens semánticos de shadcn como alias:
   `--background: var(--avd-bg)`, `--foreground: var(--avd-fg)`, `--card: var(--avd-surface)`,
   `--popover: var(--avd-bg-elev)`, `--primary: var(--avd-brand)`,
   `--primary-foreground: var(--avd-brand-fg)`, `--muted: var(--avd-bg-sunken)`,
   `--muted-foreground: var(--avd-fg-muted)`, `--border: var(--avd-border)`,
   `--input: var(--avd-border)`, `--ring: var(--avd-brand)`,
   `--destructive: var(--avd-bad)`, `--radius: var(--avd-radius-md)`.
   **Cuidado:** el legado guarda los valores como triplete HSL sin envolver (`221 83% 53%`) y
   se consumen como `hsl(var(--primary))`. Al pasar a OKLCH hay que quitar ese envoltorio
   **en el mismo commit**, en `src/index.css` y allá donde se use
   (`grep -rn "hsl(var(--" src`), o la app sale en blanco y negro.
2. **Borrar del legado**, comprobando uso a uno antes de cada borrado
   (`grep -rn "nombre-del-token" src`):
   `--surface-container-lowest/low/container`, `--primary-container`, `--primary-fixed`,
   `--primary-fixed-dim`, `--secondary-container`, `--accent-soft`, `--accent-glow`,
   `--outline-variant`, `--ticket-accent*` (si no se usan), y **los cuatro `--gradient-*`**.
3. **Quitar `background-image: var(--gradient-canvas)` del `body`.** Un degradado de fondo de
   página va contra `design.md` §5.2 y hace que cualquier superficie plana encima se vea
   sucia. El `body` pasa a `background: var(--avd-bg)`.
4. **Dejar `--vote-color-blue/red/yellow/green` como están**: son la paleta oficial de
   opciones de voto, tienen significado propio y no son parte del cromo.
5. Actualizar `CLAUDE.md`: la regla "usa solo `--avd-*`" pasa a ser cierta, y se añade que
   los nombres semánticos son alias y no fuentes.

## Ojo: la rampa `--avd-brand-*` no es el azul de esta app

Medido al portar MCM Bank a OKLCH (2026-09-02):

| Azul | OKLCH |
|---|---|
| Legado *Soft Oceanic* de esta app, `hsl(221 83% 53%)` | L .545 · C .215 · **H 263** |
| Rampa `--avd-brand-600` | L .50 · C .145 · **H 243** |
| Azul del logo MCM, `#29abe2` | L .698 · C .133 · H 232 |

Es decir: **el `--avd-*` que estamos adoptando es un azul distinto —más cian— del que la app
enseña hoy**, aunque los dos se llamen «azul institucional». MCM Bank ya está en el tono 260,
que es el del legado.

Al hacer el paso 1, **decide esto a propósito y no de rebote**: o se mueve la rampa
`--avd-brand-*` al tono 260 para que Bank y Votaciones sean de verdad el mismo azul (lo
recomendado, y lo que dice `design.md` §2), o se deja en 243 y se asume que son dos azules
distintos. Lo que no vale es que el cambio de tono se cuele dentro de un commit que dice
«unificar tokens». Si mueves la rampa, conserva las luminosidades: son las que hacen que
pase AA.

## Qué NO tocar

`src/components/projection/projection.css` en este plan (siempre oscuro, lo tratan `002` y
`003`). No renombres `--avd-*`: son 1.201 usos.

## Validación

`npm run build`. Recorrer en claro y oscuro: página de voto, lista de candidatos, tutorial,
proyección (espera, votación, resultados) y el panel de administración completo. Comprobar
que el `body` ya no tiene degradado y que ninguna superficie se ha quedado transparente.
Comprobar contraste AA en los dos temas.

---

## Ejecución del resto (2026-09-04)

Hecho lo que faltaba: pasos 1 a 5 completos. El legado *Soft Oceanic* ya no existe.

**Paso 1 · Alias.** Los nombres semánticos de shadcn se redefinen en `:root` como
`var(--avd-*)`. El `.dark` casi desaparece: como los alias apuntan a `--avd-*` y esa rampa
ya cambia en `.dark`, solo quedan ahí los que apuntan a la rampa **cruda** (`--avd-n-*`,
`--avd-brand-300/400/700`), que no cambiarían solos.

El envoltorio `hsl(var(--x))` se ha quitado en el mismo commit, como avisaba el plan: en el
bloque `@theme`, en las 8 reglas de `@layer base` y en los cuatro `.tsx` que lo usaban
(`ResultsAnalytics`, `sidebar`, `AccessCodeInput`, más `progress`). La opacidad pasa de
`hsl(var(--x) / .45)` a `color-mix`. Las utilidades de Tailwind con modificador
(`bg-overlay/82`, `border-outline-variant/40`) ya generaban `color-mix` solas: comprobado
sobre el CSS compilado, funcionan igual con OKLCH.

**Paso 2 · Borrado.** Antes de borrar apareció que **casi todo lo que quedaba estaba muerto**:

- Catorce tokens **nunca definidos en ninguna parte**, con clases que no pintaban nada:
  `--warning`, `--warning-foreground`, `--success`, `--success-foreground`, `--overlay`,
  `--overlay-foreground`, `--scrollbar`, `--sidebar-border`, `--sidebar-accent`,
  `--sidebar-accent-foreground`, `--surface-container-high`, `--surface-container-highest`,
  `--grid-fade` y `--shadow-card`. `bg-overlay/82` es un velo de modal y no pintaba nada.
  **Ahora existen**, con valor de la rampa: es el mismo hallazgo que el `003` y que el
  `@theme`, la tercera vez que sale.
- Clases sin un solo uso en la app: `.surface`, `.gradient-tech`, `.gradient-primary`,
  `.admin-soft`, `.admin-chip`, `.ticket-card/-kicker/-code/-divider`, `.font-code`,
  `.button--primary` y `.button--danger` (estas dos con sombra de color, que el `003` había
  retirado del resto). Borradas, y con ellas `--ticket-accent*`.
- `.bg-grid-fade` (en `App.tsx`) apuntaba a `--grid-fade`, que no existe: la capa se quita.
- `bg-gradient-primary` en `ui/progress.tsx` salía del config **que no se carga**: la barra
  de progreso llevaba quién sabe cuánto sin color. Pasa a `bg-primary`.
- Los cuatro `--gradient-*`, fuera.

**`tailwind.config.ts`** se queda sin `colors` ni `backgroundImage`: no los cargaba nadie y
solo servían para que los colores pareciesen definidos. Se mantiene por `content`,
`darkMode`, animaciones y plugins, con un comentario que lo dice.

**Paso 3 · `body`.** Sin `background-image`. `background-color: var(--background)`.

**Paso 4 · `--vote-color-*`** intactos, con un comentario que explica por qué no salen de la
rampa de marca.

**Paso 5 · `CLAUDE.md`** y `design.md` §7/§8 actualizados: los semánticos son alias, los
colores nuevos van al `@theme`, y un cambio de color no está comprobado hasta mirar el CSS
compilado.

### Decisión de tono

Ya estaba tomada en el commit del 2026-09-02: la rampa `--avd-brand-*` está en el tono 260,
el de MCM Bank. No se ha vuelto a mover.

### Validación

`npm run build` en verde. Sobre el CSS compilado (`dist/assets/index-*.css`):

- 0 `hsl(var(` — no queda ni un consumo del formato antiguo.
- 0 `gradient-canvas`, `gradient-tech`, `--ticket-accent`.
- `--primary: var(--avd-brand)`, `--background: var(--avd-bg)`, `--radius: var(--avd-radius-md)`.
- `--overlay` definido dos veces (claro `--avd-n-900`, oscuro `--avd-n-1000`), que antes no
  estaba ninguna.
- `body{background-color:var(--background);…}` sin `background-image`.
- Las utilidades siguen resolviendo: `.text-muted-foreground{color:var(--muted-foreground)}`,
  `.border-outline-variant/40{border-color:color-mix(in oklab, var(--outline-variant) 40%, transparent)}`.

**Pendiente de mirar en pantalla**, como el `007`: no hay credenciales de Supabase en este
entorno. Lo que cambia de aspecto a propósito y hay que confirmar en uso es el degradado del
`body` (fuera), el radio base (1rem → 10 px, §3.3), las sombras de color de los botones
(fuera) y los catorce tokens que ahora sí pintan.
