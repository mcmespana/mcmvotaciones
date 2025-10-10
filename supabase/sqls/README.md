# 📦 Guía de migraciones SQL

Esta carpeta contiene los scripts necesarios para instalar y mantener la base de datos de votaciones en Supabase. Se organizaron en tres grupos para aclarar su propósito.

## 1. Instalación base
| Archivo | Descripción |
|---------|-------------|
| `setup-database.sql` | Crea el esquema inicial (tablas principales, relaciones y restricciones). |
| `enable-realtime.sql` | Configura políticas y canales para Supabase Realtime. |

> Ejecuta estos scripts solo cuando levantas un proyecto **desde cero**.

## 2. Actualización a la versión 2.0.0
| Archivo | Uso |
|---------|-----|
| `upgrade-to-v2-0-0.sql` | Script consolidado que incluye las migraciones 001–004 en el orden correcto. Recomendado para actualizar proyectos existentes. |
| `001-rename-expected-voters-to-max-votantes.sql` | Renombra la columna y prepara el nuevo umbral fijo. |
| `002-create-seats-table.sql` | Añade la tabla de asientos y funciones auxiliares. |
| `003-update-majority-to-fixed-threshold.sql` | Reemplaza la lógica de mayoría para usar `max_votantes`. |
| `004-seats-management-api.sql` | Expone funciones SQL para gestionar cupos y verificaciones. |

Puedes ejecutar **solo `upgrade-to-v2-0-0.sql`** o correr los archivos 001–004 en secuencia cuando necesites depurar un paso específico.

## 3. Scripts de soporte
| Archivo | Cuándo usarlo |
|---------|---------------|
| `add-round-finalized-field.sql`, `add-show-results-to-voters.sql` | Cambios incrementales previos a la versión 2.0.0. Mantener solo como referencia histórica. |
| `fix-majority-calculation.sql`, `fix-majority-calculation-people.sql` | Hotfixes antiguos de la lógica de selección. |
| `fix-votes-constraint.sql`, `migration-fix-voting-rounds.sql` | Scripts utilizados para corregir datos específicos. |
| `verify-migration.sql` | Conjunto de consultas para comprobar el estado final de la base. Ejecutar después de aplicar las migraciones. |

---

### Recomendaciones
1. **Respaldo**: genera tablas `*_backup` antes de ejecutar cambios (ver [`docs/MIGRATION_INSTRUCTIONS.md`](../../docs/MIGRATION_INSTRUCTIONS.md)).
2. **Entornos locales**: usa `setup-database.sql` y luego `upgrade-to-v2-0-0.sql` para partir de un estado actualizado.
3. **Auditoría**: guarda un log de cada ejecución exportando el resultado del editor SQL de Supabase.
4. **Nuevas migraciones**: sigue el prefijo numérico (`005`, `006`, …) para mantener el orden cronológico y actualiza este README.
