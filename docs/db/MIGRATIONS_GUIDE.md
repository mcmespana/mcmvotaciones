# Database Migrations — Guía completa

Sistema basado en Supabase CLI + tracking nativo en `supabase_migrations.schema_migrations`.

## Layout

```
supabase/
├── migrations/
│   ├── 00000000000000_baseline.sql      # Snapshot reproducible (no editar)
│   ├── _template.sql                    # Plantilla para nuevas migraciones
│   └── YYYYMMDDHHMMSS_<desc>.sql        # Migraciones incrementales
└── sqls/
    ├── README.md                        # Apunta aquí
    └── _archive/                        # Scripts viejos (referencia histórica)
```

## Crear una migración nueva (paso a paso)

### 1. Generar timestamp UTC

```powershell
Get-Date -Format "yyyyMMddHHmmss"
# o
date -u +%Y%m%d%H%M%S
```

### 2. Copiar plantilla

```powershell
Copy-Item supabase/migrations/_template.sql supabase/migrations/<TIMESTAMP>_<descripcion_snake>.sql
```

Convención de nombre: `descripcion_corta_en_snake_case`. Ejemplos:
- `add_blank_votes_index`
- `drop_round_participants_table`
- `fix_select_threshold_overflow`

### 3. Escribir SQL idempotente

Reglas:

| Cambio | Sintaxis idempotente |
|--------|----------------------|
| Tabla | `CREATE TABLE IF NOT EXISTS public.x (...)` |
| Columna | `ALTER TABLE public.x ADD COLUMN IF NOT EXISTS y text` |
| Índice | `CREATE INDEX IF NOT EXISTS idx_x_y ON public.x(y)` |
| Función | `CREATE OR REPLACE FUNCTION ...` |
| Tipo enum | Wrap en `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` |
| Policy | Mismo wrap `DO $$ ... EXCEPTION duplicate_object`  |
| Drop | `DROP ... IF EXISTS` + comentario justificando |
| Trigger | `DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...` |

Envolver el cuerpo en `BEGIN; ... COMMIT;` salvo que la sentencia lo prohíba (`CREATE INDEX CONCURRENTLY`, `ALTER TYPE ... ADD VALUE` en transacción depende de versión).

### 4. Aplicar vía MCP

Con Supabase MCP conectado (project_id `sjhxhsdckvungsrbquve`):

Tool: `mcp__332567f4-..._apply_migration`
- `name`: `<TIMESTAMP>_<descripcion>` (sin `.sql`)
- `query`: contenido completo del archivo

Esto inserta la versión en `supabase_migrations.schema_migrations` automáticamente.

### 5. Verificar

```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 5;
```

O via MCP `list_migrations`. O via helper SQL:

```sql
SELECT public.is_migration_applied('20260514153000');  -- true / false
```

### 6. Commit

Junto con los cambios de código que dependen de la migración.

## Reglas de oro

1. **Nunca editar** `00000000000000_baseline.sql` después del merge inicial.
2. **Nunca editar** una migración ya aplicada. Si está mal, escribir una nueva que corrija.
3. **Nunca duplicar** versiones (timestamps únicos).
4. **Nunca reaplicar** manualmente una migración ya aplicada — incluso siendo idempotente, recrear un trigger pierde estado.
5. **Nunca añadir** archivos a `supabase/sqls/` (carpeta congelada).
6. **Nunca dropear** sin auditoría documentada en `docs/db/SCHEMA_AUDIT_*.md` + aprobación humana.

## Levantar entorno nuevo (dev/staging/clon)

1. Crear proyecto Supabase vacío.
2. Ejecutar `supabase/migrations/00000000000000_baseline.sql` (vía SQL editor o CLI `supabase db push`).
3. (Opcional) Ejecutar migraciones posteriores en orden alfabético — Supabase CLI lo hace automáticamente con `supabase db push`.

## Auditar schema actual

Antes de proponer cambios estructurales (drops, refactors):

```
mcp list_tables --schemas public --verbose
mcp execute_sql "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'"
grep -r "<nombre_tabla>" src/
grep -r "<nombre_columna>" src/
mcp get_advisors --type security
mcp get_advisors --type performance
```

Documentar hallazgos en `docs/db/SCHEMA_AUDIT_YYYY-MM-DD.md` con tabla KEEP/REMOVE + razón.

## Troubleshooting

**"version already exists" al aplicar**
Migración con ese timestamp ya está registrada. Generar nuevo timestamp y renombrar archivo.

**"function does not exist" tras aplicar baseline**
Faltan dependencias entre funciones. El baseline las define en orden correcto — si reorganizas, respeta dependencias (`update_updated_at_column` antes que los triggers que la usan).

**Lint advisor: `function_search_path_mutable`**
Añadir `SET search_path = public, extensions` después de `LANGUAGE plpgsql` en cada función.

**Quiero deshacer una migración**
Escribir migración inversa nueva (`drop_column`, `drop_function`, etc.). Nunca borrar el archivo original ni la fila de `schema_migrations`.
