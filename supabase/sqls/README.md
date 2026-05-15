# ⚠️ DEPRECATED — `supabase/sqls/`

Esta carpeta ya no es la fuente de verdad para migraciones SQL.

## Nueva ubicación

**Migraciones nuevas: [`supabase/migrations/`](../migrations/)**

- Baseline reproducible: `supabase/migrations/00000000000000_baseline.sql`
- Plantilla: `supabase/migrations/_template.sql`
- Guía completa para IA: [`AGENTS.md`](../../AGENTS.md) sección "Database Migrations"
- Guía humana: [`docs/db/MIGRATIONS_GUIDE.md`](../../docs/db/MIGRATIONS_GUIDE.md)
- Auditoría schema actual: [`docs/db/SCHEMA_AUDIT_2026-05-14.md`](../../docs/db/SCHEMA_AUDIT_2026-05-14.md)

## `_archive/`

Contiene los scripts ad-hoc usados antes de adoptar el flujo `supabase/migrations/` con tracking nativo en `supabase_migrations.schema_migrations`. Solo referencia histórica — **no ejecutar**. El estado actual de la BD productiva ya incluye los efectos de todos esos scripts.
