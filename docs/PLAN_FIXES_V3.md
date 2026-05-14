# Plan de Fixes v3 — Responsive Admin + Proyección + Orden por Ronda + Estados Cierre

Fecha inicio: 2026-05-14
Branch: `claude/reverent-wu-2334e6`

Marca `[x]` cada item al completarlo. Items derivados de auditoría realizada el 2026-05-14.

---

## 1. Responsive admin (todas las pantallas)

### 1.1 `src/pages/AdminDashboard.tsx`
- [x] Header buttons con `flex-wrap` + `sm:gap-1`
- [x] Stack vertical de acciones "Usuarios/Tipos" en mobile

### 1.2 `src/components/admin/AdminVotingList.tsx`
- [x] Tabla list-view envolver en `overflow-x-auto` con `min-w-[720px]`
- [x] Search input `w-[200px]` → `w-full sm:w-[200px]`
- [x] Modal form `avd-form-grid-2` → `grid-cols-1 md:grid-cols-2`
- [x] Modal `max-w-[90vw] sm:max-w-[560px]`

### 1.3 `src/components/admin/ResultsAnalytics.tsx`
- [x] Select trigger `w-64` → `w-full md:w-64`
- [x] Cards → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
- [x] Charts: altura responsive con `useIsMobile()` (250/350)
- [x] Results table en `overflow-x-auto`

### 1.4 `src/components/admin/UserManagement.tsx`
- [x] Toolbar `flex-wrap sm:flex-nowrap`, search `w-full sm:w-[200px]`
- [x] Card header `flex-col sm:flex-row sm:items-center`
- [x] Create form `grid-cols-1 md:grid-cols-2`

### 1.5 `src/components/admin/VotingTypesManager.tsx`
- [x] Modal `max-w-[90vw] sm:max-w-[560px]`
- [x] New type form `grid-cols-2 md:grid-cols-4`
- [x] Edit form `grid-cols-1 md:grid-cols-3`

### 1.6 `src/components/admin/ComunicaImport.tsx`
- [x] Review table en `overflow-x-auto`
- [x] Page padding `px-4 sm:px-6`
- [x] Search `min-w-[150px]`

### 1.7 `src/components/admin/voting-detail/*`
- [x] `index.css` — `.avd-page-main` con grid responsive (`max-width: 1023px` → 1 col)
- [x] `PageHeader.tsx` — `flex-wrap`, "CSV" `hidden sm:inline-flex`
- [x] `CandidatesPane.tsx` — search `w-full sm:w-[180px]`, botones con Tailwind responsive
- [ ] `ControlsAside.tsx` — aside stack debajo en mobile (cubierto por CSS `avd-page-main` 1-col)

---

## 2. Proyección — sizing fluido + visibilidad total

### 2.1 `src/components/projection/projection.css`
- [x] Reemplazar font-sizes hardcoded por `clamp()` (proj-vote-num, proj-waiting-title, proj-header-title, proj-topbar-title, proj-clock, proj-timer, proj-stat-num/sub, proj-vote-max, proj-progress-pct, proj-final-title, proj-row-name, proj-row-votes-num, proj-result-votes-num, proj-sidebar-name, proj-code-glyph/zero, proj-qr-scan-desc, proj-waiting-subtitle, headers --lg)
- [x] Sidebar widths `380px`/`400px` → `clamp(280px, 22vw, 420px)`
- [x] Ballot grid → `repeat(auto-fit, minmax(160px, 1fr))`
- [x] Access code chars → `clamp(48px, 6vw, 100px)`
- [x] Paddings principales en `clamp()` para escalar 1080p→4K

### 2.2 `src/components/projection/ProjectionVoting.tsx`
- [x] `gridTemplateColumns` → `'1fr clamp(280px, 22vw, 420px)'`
- [x] Padding inline migrado a CSS clamp

### 2.3 `src/components/projection/ProjectionResults.tsx`
- [x] Top 5 grid → `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]`
- [x] Sort `selectedCandidates` por `selected_in_round ASC` (sección 3)

### 2.4 `src/components/projection/ProjectionFinalResults.tsx`
- [x] Grid columnas → `repeat(auto-fit, minmax(clamp(220px,18vw,320px), 1fr))`
- [x] Textos `text-[20px]/text-[26px]` → `text-[clamp(18px,1.4vw,28px)]`
- [x] Avatares: tamaños manejados vía CSS clamp en `projection.css`

### 2.5 `src/components/projection/_shared.tsx`
- [x] `BallotsGrid` fallback → `grid-cols-[repeat(auto-fit,minmax(160px,1fr))]`
- [x] `SelectedCandidatesSidebar`: sort por `selected_in_round` (copia, sin mutar prop)

---

## 3. Orden por ronda de seleccionados

Campo BD: `candidates.selected_in_round` (presente desde migración 009).

- [x] `src/hooks/useProjectionData.ts:89` — sort `selectedCandidates` por `selected_in_round ASC` + tie-break `selected_vote_count DESC`
- [x] `SelectedCandidatesSidebar` ordena copia sin mutar
- [x] `ProjectionFinalResults` / `ProjectionResults` consumen `selectedCandidates` ya ordenado (badge "Ronda X" presente)
- [ ] `SeatsLiveCard.tsx` admin — verificar si consume orden (deferred: read-only de selected)

---

## 4. Bugs de estado al cerrar votación

### 4.1 Cierre definitivo no-atómico
- [x] `closeVoting()` ya es atómica (`.update` con todos los flags). Realtime: tras `is_closed=true` los listeners de `rounds` ya refrescan.

### 4.2 `startNextRound` no resetea `is_closed`
- [x] `useRoundActions.ts:177` — añadido `is_closed: false` + `show_final_gallery_projection: false` al update

### 4.3 VotingPage no bloquea `round_finalized && !is_closed`
- [x] Ya cubierto por `VotingPage.tsx:285` (`is_closed || !is_active || round_finalized` muestra "Ronda Finalizada"). Verificado en auditoría.

### 4.4 Realtime overhead tras cierre
- [x] Ya hay debounce 1s en votes-channel (`useProjectionData.ts:306-317`). Inserts a `votes` bloqueados por RLS app-level una vez `is_voting_open=false`. No requiere fix adicional.

### 4.5 Race condition `toggleGallery`
- [x] `useRoundActions.ts:214-238` — reemplazado select+update por UPDATE atómico con `WHERE show_final_gallery_projection=true AND id<>roundId` (sin TOCTOU)

### 4.6 Blank votes en galería final
- [ ] Documentar en `docs/VOTING_SYSTEM_GUIDE.md` (deferred — no es bug, es comportamiento intencionado)

---

## 5. Reorganización docs

- [x] Sin obsoletos en `docs/` (auditoría)
- [x] Memoria stale `BACKLOG_V3_FUNCIONAL.md` eliminada → reemplazada por `project_v3_fixes.md`
- [ ] Mover `PLAN_FIXES_V3.md` a `docs/old_plans/` cuando 100 % items `[x]`

---

## 7. Sistema de migraciones BD

### 7.1 Auditoría schema actual
- [x] `list_tables` (10 tablas)
- [x] `pg_proc` (27 funciones)
- [x] Cross-grep `round_participants`, `vote_history`, etc. en `src/`
- [x] Indexes, triggers, policies vía MCP
- [x] `docs/db/SCHEMA_AUDIT_2026-05-14.md` generado
- [x] Advisors `security` + `performance` incluidos

### 7.2 Baseline snapshot
- [x] `supabase/migrations/00000000000000_baseline.sql` (extensions, enums, tablas, indexes, funciones, triggers, RLS, realtime publication)
- [x] Idempotente (`IF NOT EXISTS`, `OR REPLACE`, `DO $$ EXCEPTION duplicate_object`)
- [x] Solo schema (sin datos)
- [ ] Validar en BD vacía local — pendiente entorno test

### 7.3 Archivar scripts viejos
- [x] `supabase/sqls/_archive/` creado, 28 archivos movidos
- [x] `supabase/sqls/README.md` reescrito apuntando al nuevo flujo

### 7.4 Tracking
- [x] `supabase_migrations.schema_migrations` (nativo Supabase CLI)
- [x] Helper `public.is_migration_applied(text) RETURNS boolean` añadido al baseline

### 7.5 Convención nombres
- [x] `YYYYMMDDHHMMSS_descripcion_snake.sql`
- [x] `supabase/migrations/_template.sql` creado

### 7.6 Documentación IA + humanos
- [x] Sección "Database Migrations" en `AGENTS.md`
- [x] `docs/db/MIGRATIONS_GUIDE.md` versión larga

### 7.7 Limpieza schema (pendiente aprobación humana)
- [ ] `<ts>_drop_round_participants.sql` — tabla muerta (0 rows, 0 refs)
- [ ] `<ts>_set_function_search_path.sql` — 26 funciones con search_path mutable
- [ ] `<ts>_drop_unused_indexes.sql` — `idx_seats_last_seen`, `idx_rounds_active`
- [ ] `<ts>_add_missing_fk_indexes.sql` — FKs sin índice
- [ ] `<ts>_restrict_security_definer_grants.sql` — revoke EXECUTE a anon/auth de funciones críticas
- [ ] `<ts>_storage_bucket_candidate_photos_lockdown.sql` — restringir listado público

---

## 8. Verificación final

- [x] `npm run lint` — 2 errores pre-existentes (no introducidos), 0 nuevos
- [x] `npm run build` — OK, 5.00s, 0 errores
- [ ] Smoke test manual: admin mobile (375px) / tablet (768px) / proyección 1080p + 4K
- [ ] Flujo completo: abrir sala → votar → finalizar → resultados → siguiente ronda → cerrar definitivo → galería final
- [ ] Commit + PR
