# 🔧 Migraciones SQL

Guía para preparar o actualizar la base de datos de Supabase sin perder el hilo.

> 🎯 **Objetivo**: saber qué scripts ejecutar, en qué orden y cómo validar la regla del Canon 119.  
> 🧯 **Regla de oro**: en producción, primero backup; después migración.

---

## 🧭 Mapa rápido

| Caso | Qué hacer |
|------|-----------|
| Instalación nueva | `setup-database.sql` + migraciones numeradas en orden. |
| Proyecto ya existente | Backup + aplicar solo migraciones pendientes. |
| Duda con el orden | Revisar [../supabase/sqls/README.md](../supabase/sqls/README.md). |
| Error durante migración | Parar, revisar logs y restaurar si hay datos reales. |

---

## 1️⃣ Backup antes de producción

Ejecuta una copia de tablas críticas antes de tocar una base con datos reales:

```sql
CREATE TABLE rounds_backup AS SELECT * FROM rounds;
CREATE TABLE candidates_backup AS SELECT * FROM candidates;
CREATE TABLE votes_backup AS SELECT * FROM votes;
CREATE TABLE round_results_backup AS SELECT * FROM round_results;
CREATE TABLE seats_backup AS SELECT * FROM seats;
```

> ℹ️ Si alguna tabla todavía no existe, omite esa línea.  
> 📌 Guarda también un backup externo desde el dashboard de Supabase si la votación es importante.

---

## 2️⃣ Instalación nueva

### Orden recomendado

| Paso | Archivo | Qué hace |
|------|---------|----------|
| 1 | `supabase/sqls/setup-database.sql` | Crea tablas base, funciones y permisos iniciales. |
| 2 | `001-rename-expected-voters-to-max-votantes.sql` | Cambia la semántica a cupos máximos. |
| 3 | `002-create-seats-table.sql` | Añade asientos/cupos técnicos de votantes. |
| 4 | `003-update-majority-to-fixed-threshold.sql` | Aplica umbral fijo según Canon 119. |
| 5 | `004-seats-management-api.sql` | Añade RPC para gestionar asientos. |
| 6 | `005+` | Aplica mejoras posteriores en orden numérico. |

Después crea tu primer administrador. El setup no deja una password conocida en el repo.

---

## 3️⃣ Actualizar una instalación existente

1. Identifica qué scripts ya se aplicaron.
2. Haz backup.
3. Aplica las migraciones que falten en orden.
4. Valida funciones clave.
5. Haz una votación de prueba antes de usarlo en una sesión real.

### Validación rápida

```sql
SELECT calculate_selection_threshold(3);  -- esperado: 2
SELECT calculate_selection_threshold(4);  -- esperado: 3
SELECT calculate_selection_threshold(5);  -- esperado: 3
SELECT calculate_selection_threshold(10); -- esperado: 6
```

---

## ⚖️ Umbral Canon 119

La fórmula correcta es:

```text
floor(max_votantes / 2) + 1
```

| `max_votantes` | Umbral |
|----------------|--------|
| 3 | 2 |
| 4 | 3 |
| 5 | 3 |
| 10 | 6 |

> ⚠️ **Atención con migraciones antiguas**  
> Si una instalación conserva una función basada en `ceil(max_votantes * 0.5)`, con 4 votantes daría 2. Para Canon 119 debe dar 3.

---

## 🧩 Funciones SQL importantes

| Función | Uso |
|---------|-----|
| `calculate_selection_threshold(max_votantes)` | Calcula el umbral de elección. |
| `join_round_seat(...)` | Reserva o recupera asiento para un votante. |
| `verify_seat(...)` | Comprueba que el asiento sigue activo. |
| `get_round_seats_status(round_id)` | Devuelve ocupados, expirados y disponibles. |
| `process_round_results(round_id, round_number)` | Procesa resultados de una ronda. |
| `start_new_round(round_id)` | Prepara la siguiente ronda. |

---

## 🧪 Prueba mínima tras migrar

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Crear votación con `max_votantes = 3`. | Umbral 2. |
| 2 | Añadir tres candidatos. | Candidatos visibles. |
| 3 | Emitir una sola papeleta. | Nadie queda elegido. |
| 4 | Repetir con dos votos al mismo candidato. | Ese candidato queda elegido. |
| 5 | Iniciar siguiente ronda. | Solo compiten pendientes. |

---

## 🧯 Rollback

El rollback depende del punto exacto donde falló la migración.

| Situación | Recomendación |
|-----------|---------------|
| Fallo antes de votos reales | Restaurar desde tablas `*_backup` o backup Supabase. |
| Fallo después de votos reales | No hacer rollback parcial sin revisar datos. |
| Migración a medias | Parar, revisar SQL Editor History y aplicar corrección controlada. |

> 🛑 No borres tablas de votos o resultados reales sin una copia verificada.

---

## 📚 Relacionado

- ⚡ [Inicio rápido](./QUICK_START.md)
- 🗳️ [Guía funcional](./VOTING_SYSTEM_GUIDE.md)
- 📦 [README de SQL](../supabase/sqls/README.md)
