# 📥 Importación desde SinergiaCRM

La ruta `/comunica` permite importar candidatos desde una instancia de SinergiaCRM/SuiteCRM hacia una votación existente.

> 🧩 **Es opcional**: si otra entidad hace fork y no usa SinergiaCRM, puede ignorar esta parte, quitar la ruta o adaptar el proxy a otro CRM.  
> 🔐 **Nunca publiques credenciales reales** en esta guía, ejemplos, issues o commits.

---

## 🎯 Qué permite hacer

- Elegir una votación de destino.
- Consultar personas desde el CRM.
- Filtrar por tipo de relación.
- Revisar candidatos antes de importar.
- Evitar duplicados por `crm_id`.
- Guardar campos útiles para revisar candidaturas.

---

## 🧭 Flujo de uso

| Paso | Acción | Quién |
|------|--------|-------|
| 1 | Entrar en `/comunica`. | Admin |
| 2 | Seleccionar votación destino. | Admin |
| 3 | Configurar credenciales CRM o usar secrets. | Técnico/Admin |
| 4 | Descargar contactos. | Sistema |
| 5 | Revisar y seleccionar personas. | Admin |
| 6 | Importar candidatos. | Sistema |
| 7 | Volver a la votación y revisar lista. | Admin |

---

## 🏗️ Arquitectura

```text
Navegador (/comunica)
   │
   ▼
src/lib/sinergiaCRM.ts
   │
   ▼
Supabase Edge Function: crm-proxy
   │
   ▼
SinergiaCRM / SuiteCRM REST API
```

| Archivo | Función |
|---------|---------|
| `src/routes/ComunicaRouter.tsx` | Protege la ruta. |
| `src/components/admin/ComunicaImport.tsx` | Wizard de importación. |
| `src/lib/sinergiaCRM.ts` | Cliente TypeScript y normalización. |
| `supabase/functions/crm-proxy/index.ts` | Proxy para evitar CORS y proteger credenciales. |
| `supabase/sqls/add-crm-fields-to-candidates.sql` | Campos extra en `candidates`. |
| `docs/crm-reference/CAMPOS_SINERGIA_CRM.md` | Referencia de campos conocidos. |

---

## 🔐 Configuración segura

Configura los secretos en Supabase Edge Functions:

```bash
supabase secrets set \
  SINERGIA_URL='https://crm.example.org/custom/service/v4_1/rest.php' \
  SINERGIA_USER='usuario-api' \
  SINERGIA_PASS='password-segura'
```

### Buenas prácticas

| Haz esto | Evita esto |
|----------|------------|
| Usar un usuario API con permisos mínimos. | Usar un usuario personal de administración total. |
| Guardar credenciales como Supabase secrets. | Poner passwords en Markdown o código frontend. |
| Rotar credenciales si se publicaron. | Confiar en “ya lo borraré del commit”. |
| Usar placeholders en ejemplos. | Usar datos reales en snippets. |

---

## 🗄️ Campos importados

| Campo CRM | Campo en `candidates` | Uso |
|-----------|------------------------|-----|
| `id` | `crm_id` | Identificador estable para evitar duplicados. |
| `first_name` | `name` | Nombre. |
| `last_name` | `surname` | Apellidos. |
| `assigned_user_name` | `location` | Delegación/localidad o agrupación principal. |
| `stic_age_c` | `age` | Edad si el CRM la devuelve. |
| `birthdate` | `birthdate` | Fecha de nacimiento. |
| `stic_identification_number_c` | `dni` | Documento identificativo, si aplica. |
| `ajmcm_etapa_c` | `etapa` | Etapa o categoría interna. |
| `stic_relationship_type_c` | `crm_relationship_types` | Relación: grupo, monitor, etc. |

> ⚠️ Los datos personales importados no deben subirse al repositorio ni compartirse en capturas públicas.

---

## 🧪 Validación manual

| Revisión | Esperado |
|----------|----------|
| `/comunica` requiere login admin. | No entra un usuario no autenticado. |
| Sin secrets ni credenciales manuales. | El proxy devuelve error claro. |
| Con credenciales válidas. | Carga contactos. |
| Reimportar misma persona. | Se omite por duplicado. |
| Importar lote grande. | Inserta por lotes sin duplicar. |

---

## 🧯 Problemas frecuentes

| Síntoma | Posible causa | Qué revisar |
|---------|---------------|-------------|
| Error CORS | Llamada directa al CRM desde navegador. | Usar `crm-proxy`. |
| “credentials not configured” | Faltan secrets o credenciales manuales. | `SINERGIA_USER`, `SINERGIA_PASS`. |
| “CRM URL not configured” | Falta `SINERGIA_URL`. | Secrets de Edge Function. |
| Faltan campos | El proxy no los pide en `SELECT_FIELDS`. | `supabase/functions/crm-proxy/index.ts`. |
| Duplicados | Falta índice por `round_id` + `crm_id`. | Migración CRM. |

---

## 🧹 Para forks que no usen SinergiaCRM

Opciones razonables:

- Ignorar la ruta `/comunica`.
- Quitar la ruta y la Edge Function.
- Reutilizar el patrón de proxy para otro CRM.
- Usar solo importación por CSV/JSON/XML desde `files/`.

---

## 📚 Relacionado

- 🔐 [Seguridad](./SECURITY.md)
- 🗳️ [Guía funcional](./VOTING_SYSTEM_GUIDE.md)
- 📄 [Campos de CRM](./crm-reference/CAMPOS_SINERGIA_CRM.md)
