# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`: `components/` (feature/UI components; shadcn under `components/ui`), `pages/` (route views), `hooks/`, and `lib/`.
- Entrypoints: `index.html`, `src/main.tsx`, and `src/App.tsx`. Static assets are in `public/`.
- Routing is defined in `src/App.tsx` (`react-router-dom`). Add new routes above the catch‑all `*` route.
- Path alias: `@` → `src` (see `tsconfig.json` and `vite.config.ts`). Example: `import { Button } from "@/components/ui/button"`.

## Build, Test, and Development Commands
- `npm i`: install dependencies.
- `npm run dev`: start Vite dev server at `http://localhost:8080`.
- `npm run build`: production build to `dist/`.
- `npm run build:dev`: development‑mode build (useful for debugging builds).
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint (TypeScript + React Hooks rules).

## Coding Style & Naming Conventions
- Use TypeScript and React functional components. Prefer named exports, 2‑space indent, and semicolons.
- Components: PascalCase files in `src/components` (e.g., `FeatureCard.tsx`). Hooks: `useX.ts(x)` in `src/hooks`.
- Keep styles with Tailwind utility classes; reuse primitives from `src/components/ui`.
- Fix all ESLint findings before pushing; config is in `eslint.config.js`.

## Testing Guidelines
- No formal test suite yet. Validate changes with `npm run dev` (smoke test key flows) and `npm run preview`.
- If introducing tests, prefer Vitest + React Testing Library. Name files `*.test.tsx` next to the module.

## Commit & Pull Request Guidelines
- History mixes styles; prefer Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`. Example: `fix: add missing ActivitiesSection import`.
- Write imperative, concise subjects (≤72 chars). Include context in body when needed.
- PRs must include: clear description, linked issues, screenshots for UI, and reproduction steps. Ensure `npm run lint` passes and the app runs cleanly.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local`; only client‑safe vars prefixed `VITE_` are exposed by Vite.
- Follow the design tokens in `tailwind.config.ts` to keep colors, spacing, and radii consistent.

## Database Migrations (IMPORTANT for AI agents)

Authoritative DB folder: `supabase/migrations/`. Legacy ad-hoc scripts live in `supabase/sqls/_archive/` — **do not** add new files there.

### Layout
- `supabase/migrations/00000000000000_baseline.sql` — full schema snapshot (idempotent). Reproduces current DB on an empty instance. **Never edit after merge.**
- `supabase/migrations/YYYYMMDDHHMMSS_<snake_description>.sql` — incremental change. **Never edit after applied.** If wrong, create a new corrective migration.
- `supabase/migrations/_template.sql` — copy this when creating new migrations.

### Required rules per file
1. **Filename**: UTC timestamp `YYYYMMDDHHMMSS_short_desc.sql` (e.g. `20260514153000_add_blank_votes_index.sql`).
2. **Header comment** with: purpose, author, date, related issue/PR.
3. **Idempotent SQL only**:
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `CREATE OR REPLACE FUNCTION`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - Policies/types/enums wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
4. **Transactional**: wrap body in `BEGIN; ... COMMIT;` (unless statement disallows transactions — e.g. `CREATE INDEX CONCURRENTLY`).
5. **No data deletes** without explicit user confirmation. `DROP` allowed only with `IF EXISTS` and a comment explaining why.

### How to check if a migration is already applied
Two equivalent sources (Supabase tracks both):
- MCP: `mcp__332567f4-..._list_migrations` returns array of applied versions.
- SQL: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;`

Helper function exposed for app code/RPC: `SELECT public.is_migration_applied('20260514153000');` returns `boolean`.

**Always check before applying.** Never re-apply blindly — even idempotent SQL can be surprising (e.g. recreating a trigger drops its state).

### How to apply a new migration (AI flow)
1. Generate timestamp: `date -u +%Y%m%d%H%M%S` (or `Get-Date -Format "yyyyMMddHHmmss"` in PowerShell).
2. Copy `_template.sql` to `supabase/migrations/<timestamp>_<desc>.sql`.
3. Write idempotent SQL. Test locally with `supabase db reset` if Supabase CLI installed.
4. Apply via MCP: `mcp__332567f4-..._apply_migration` with `name=<timestamp>_<desc>` and `query=<file contents>`. This inserts into `schema_migrations` automatically.
5. Verify with `list_migrations` that version now appears.
6. Commit the migration file together with code changes that depend on it.

### Never
- Edit `00000000000000_baseline.sql` after merge.
- Edit any applied migration file.
- Re-run a migration manually after it was applied via MCP/CLI.
- Add files to `supabase/sqls/` (read-only archive).
- Drop tables/columns/functions without an audit entry in `docs/db/SCHEMA_AUDIT_*.md` and user approval.

### Auditing dead schema
Before proposing drops, run:
- `list_tables` + grep usage in `src/**/*.ts(x)` for each table.
- `pg_proc` query for functions + grep `.rpc(` calls.
- `information_schema.columns` per table + grep column names in source.
Document findings in `docs/db/SCHEMA_AUDIT_YYYY-MM-DD.md` with KEEP/REMOVE + rationale. Only after human approval write the drop migration.

