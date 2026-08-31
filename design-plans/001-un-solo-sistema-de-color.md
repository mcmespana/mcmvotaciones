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

## Qué NO tocar

`src/components/projection/projection.css` en este plan (siempre oscuro, lo tratan `002` y
`003`). No renombres `--avd-*`: son 1.201 usos.

## Validación

`npm run build`. Recorrer en claro y oscuro: página de voto, lista de candidatos, tutorial,
proyección (espera, votación, resultados) y el panel de administración completo. Comprobar
que el `body` ya no tiene degradado y que ninguna superficie se ha quedado transparente.
Comprobar contraste AA en los dos temas.
