# Schema Audit — 2026-05-14

Generado vía Supabase MCP (project `sjhxhsdckvungsrbquve`, PG 17.6).

## Resumen

- 10 tablas en `public`
- 27 funciones + 9 triggers
- 3 enums (`seat_status`, `team_type`, `user_role`)
- 10 migraciones registradas en `supabase_migrations.schema_migrations`
- 5 tablas en `supabase_realtime` publication: `candidates, round_results, rounds, seats, votes`
- Extensiones instaladas: `pgcrypto, uuid-ossp, pg_stat_statements, supabase_vault, pg_cron, plpgsql`

## Hallazgos

### Críticos

| Item | Tipo | Estado | Acción |
|------|------|--------|--------|
| `round_participants` | tabla | **DEAD CODE** — RLS OFF, 0 rows, 0 referencias en `src/` | **DROP** (migración separada tras aprobación) |
| RLS deshabilitado en `round_participants` | seguridad | Crítico si la tabla se mantiene | DROP tabla o `ENABLE RLS` + policies |

### Warnings (Supabase advisors)

| Item | Acción recomendada |
|------|--------------------|
| 26 funciones con `search_path` mutable | Añadir `SET search_path = public, extensions` en cada `CREATE FUNCTION`. Migración masiva. |
| 7 `RLS Policy Always True` (admin_users, candidates, round_results, rounds, seats, vote_history, votes, voting_types) | **Decisión de diseño documentada**: app-level auth. Mantener tal cual. Anotar en comentarios. |
| 7 funciones SECURITY DEFINER ejecutables por `anon`/`authenticated` | Revisar caso por caso. `authenticate_admin` debe permanecer público (login). Los demás (`calculate_round_results`, `confirm_round_selection`, `get_vote_results`, `reopen_round_after_unselect`, `start_new_round`, `unselect_candidate`) deberían restringirse a `service_role` o pasar a `SECURITY INVOKER`. |
| Storage bucket `candidate-photos` público con SELECT amplio | Reducir policy a leer objetos específicos sin permitir listado. |
| `verify_vote_hash` accede a `votes`/`rounds` sin `public.` prefix | Cosmético; añadir prefijo para evitar resolución por search_path. |

### Performance

| Item | Acción |
|------|--------|
| FK sin índice: `round_participants.candidate_id` | N/A si dropea la tabla |
| FK sin índice: `round_results.candidate_id` | `CREATE INDEX idx_round_results_candidate ON round_results(candidate_id);` |
| FK sin índice: `rounds.voting_type_id` | `CREATE INDEX idx_rounds_voting_type ON rounds(voting_type_id);` |
| FK sin índice: `vote_history.exported_by, round_id` | Añadir índices o mantener si la tabla queda sin uso |
| Índice `idx_seats_last_seen` nunca usado | **DROP** o revisar query plan tras refactor |
| Índice `idx_rounds_active` nunca usado | **DROP** o revisar |

### Tablas / columnas posiblemente muertas

| Objeto | Estado | Recomendación |
|--------|--------|---------------|
| `round_participants` (tabla, 0 rows) | Sin uso en `src/` | DROP |
| `vote_history` (tabla, 0 rows) | Solo aparece tipada en `src/lib/supabase.ts`; ningún endpoint la escribe | Decidir: KEEP si se planea exportador; DROP si no |
| `z_nopausasupabase` (tabla, 6 rows) | Hack anti-auto-pause de Supabase Free Tier | KEEP — propósito intencionado, documentar |
| `candidates.elimination_round` | Buscar uso | Probable dead — sustituido por flujo `is_selected` + `selected_in_round` |
| `candidates.crm_*`, `asamblea_*`, `monitor_*`, `grupo_mcm` | Usados por `ComunicaImport` + `PublicCandidates` | KEEP |
| `votes.invalidation_reason`, `invalidated_at`, `is_invalidated` | Usados en `calculate_round_results_with_majority` | KEEP |

## Plan de limpieza (migraciones separadas)

Tras aprobación humana, generar migraciones independientes:

1. `<ts>_drop_round_participants.sql` — drop tabla muerta
2. `<ts>_set_function_search_path.sql` — `ALTER FUNCTION ... SET search_path = public, extensions` para las 26 funciones
3. `<ts>_drop_unused_indexes.sql` — drop `idx_seats_last_seen`, `idx_rounds_active`
4. `<ts>_add_missing_fk_indexes.sql` — índices para `round_results.candidate_id`, `rounds.voting_type_id`
5. `<ts>_restrict_security_definer_grants.sql` — revoke EXECUTE de `anon`/`authenticated` en funciones críticas
6. `<ts>_storage_bucket_candidate_photos_lockdown.sql` — restringir listado público

NO ejecutar nada de esto hasta confirmación.

## Migraciones ya aplicadas

```
20260410111628 add_crm_fields_to_candidates
20260415163524 add_round_room_lifecycle_flags
20260417215537 fix_percentage_by_round_votes_keep_majority_by_voters_v2
20260417215732 fix_percentage_and_majority_by_ballots
20260418103708 008_add_show_final_gallery
20260425082833 add_slug_to_rounds
20260430104928 014_fix_selection_threshold_canon_119
20260503215514 candidate_photos_bucket
20260505210658 drop_single_public_round_restriction
20260509164345 add_seats_and_candidates_to_realtime
```

Tracking nativo en `supabase_migrations.schema_migrations`. **No insertar baseline ahí** — ya están todas las migraciones que produjeron el schema actual. El baseline file `00000000000000_baseline.sql` sirve únicamente para reproducir el schema en instancias nuevas, no para tracking de cambios sobre la BD existente.
