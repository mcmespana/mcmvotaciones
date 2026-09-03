# MCM Votaciones — Claude Code Instructions

## Before touching anything: use graphify

Run `/graphify query "..."` before refactoring or debugging — the graph at `graphify-out/` is the fastest way to know what depends on what. Update it after any session where you changed or added files:

```bash
/graphify . --update
```

No need to count files — if you edited something meaningful, update the graph.

## Diseño: lee `design.md` primero

**Antes de tocar cualquier cosa visual, lee `design.md` (raíz del repo).** Es el sistema de
diseño compartido por las cuatro apps MCM (`mcmbank`, `mcmrecursos`, `mcmshop`,
`mcmvotaciones`): color, tipografía, espacio, movimiento, estados de acción, patrón de
deshacer, accesibilidad, microcopia y la lista de anti-defaults. Su §7 describe esta app —las
tres superficies (votante, proyección, administración) y sus reglas propias— y su §8 apunta a
`design-plans/`, con la deuda de diseño en planes ejecutables.

Aviso importante que está detallado allí: **`src/index.css` tiene dos sistemas de color vivos
a la vez** (el legado *Soft Oceanic* en HSL y el actual `--avd-*` en OKLCH). Escribe siempre
con `--avd-*` y no metas nada nuevo en el legado.

## CSS rules (always, no exceptions)

### 1. Use `--avd-*` tokens only
All colors, backgrounds, borders, and shadows must use the design tokens from `src/index.css`. No hardcoded hex or rgba. Use `color-mix(in oklch, var(--avd-x) N%, transparent)` for opacity variants.

Key semantic tokens: `--avd-bg`, `--avd-surface`, `--avd-border`, `--avd-fg`, `--avd-fg-muted`, `--avd-fg-faint`, `--avd-brand`, `--avd-ok`, `--avd-warn`, `--avd-bad`, `--avd-ok-bg/fg`, `--avd-warn-bg/fg`, `--avd-n-{50…1000}`.

### 2. Always ship both light and dark
Every component needs both variants. Default = light. Dark = `.dark .my-class`.

```css
.my-class       { background: var(--avd-bg); color: var(--avd-fg); }
.dark .my-class { background: var(--avd-n-950); color: var(--avd-n-100); }
```

Exceptions (always-dark, no override needed): projection screens, `graphify-out/graph.html`.

### 3. iOS Safari: inputs ≥ 16px on touch
Already covered by the `@media (hover: none) and (pointer: coarse)` rule in `index.css`. Don't add new inputs below 16px on mobile.

## DB migrations

New file every time. Never edit an applied migration. File: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`. Use `CREATE OR REPLACE` / `IF NOT EXISTS` / `IF EXISTS`. Apply via Supabase MCP.

## Project layout

| Path | What it is |
|------|-----------|
| `src/styles/vision-plus.css` | Accessibility font-size scaling (200% mode) |
| `src/index.css` | All `--avd-*` tokens + global styles |
| `src/pages/` | Page-level components |
| `src/components/voting/` | Voter-facing UI |
| `src/components/projection/` | Always-dark projection screens |
| `src/components/admin/` | Admin panel |
| `supabase/migrations/` | DB migrations (append-only) |
| `graphify-out/` | Knowledge graph — query before exploring blind |
