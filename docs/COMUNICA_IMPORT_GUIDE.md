# 📥 Guía de Importación de Candidatos desde SinergiaCRM

## 🎯 Descripción General

La ruta `/comunica` es una **herramienta administrativa protegida** que permite importar candidatos directamente desde **SinergiaCRM** (v4.1 basado en SuiteCRM) a la plataforma de votación.

**Funcionalidades principales:**
- ✅ Seleccionar una votación/ronda existente
- ✅ Obtener **todas las personas** del CRM automáticamente
- ✅ Ver datos **agrupados por MCM Local** y **ordenados por edad** (ascendente)
- ✅ Seleccionar personas individuales o en lote
- ✅ Importar directamente con campos adicionales para uso futuro
- ✅ Evitar duplicados automáticamente

---

## 🔐 Acceso y Seguridad

### Requisitos
- **Rol:** Administrador (mismo sistema que `/admin`)
- **Ubicación:** `http://localhost:8080/comunica` (desarrollo) o tu dominio/comunica (producción)
- **Login:** Usa tus credenciales de admin; la sesión es compartida con `/admin`

### Protección
- La ruta está **oculta del menú UI** pero accesible vía URL
- Requiere **autenticación con credenciales admin** (email + contraseña bcrypt)
- Si no estás logueado → redirect a formulario de auth
- Si no eres admin → mensaje de "Acceso Denegado"

---

## 🏗️ Arquitectura Técnica

### 1. Proxy Edge Function (Supabase)

**Archivo:** `supabase/functions/crm-proxy/index.ts`

**Responsabilidad:** Actúa como intermediario entre la SPA y SinergiaCRM para:
- Evitar errores CORS (SinergiaCRM es un servidor PHP externo)
- Ocultar credenciales (guardadas en **Function Secrets**, no en variables VITE_*)
- Paginar datos y traer todos los contactos

**Deployed en:** Supabase Edge Function (ID: 33587803-c530-451d-82ab-df7b0edb673b)

**Secrets configurados** (en dashboard Supabase → Edge Functions → Secrets):
```
SINERGIA_URL=https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php
SINERGIA_USER=api_user
SINERGIA_PASS=w780kAp6GeG&EEffJBe0iVa)
```

**⚠️ IMPORTANTE:** Los secrets NO están en `.env.local`. Se configuran directamente en Supabase.

---

### 2. Cliente TypeScript

**Archivo:** `src/lib/sinergiaCRM.ts`

Expone:
- **`CRMContact`**: Interface tipada con todos los campos
- **`fetchAllCRMContacts()`**: Llama a la edge function, normaliza datos, ordena por (location, age)
- **`groupByLocation()`**: Agrupa contactos por MCM Local para el accordion

**Campo clave:** `crm_id` (usado como identificador único estable en la BBDD)

---

### 3. Componentes React

#### `src/components/ComunicaRouter.tsx`
Patrón idéntico a `AdminRouter.tsx`:
- Verifica Supabase configurado
- Verifica autenticación (mostrar login si no)
- Verifica rol admin (mostrar "Acceso Denegado" si no)
- Renderiza `<ComunicaImport />` si todo OK

#### `src/components/ComunicaImport.tsx` (Wizard de 5 pasos)

**Paso 1: Seleccionar votación**
- Dropdown con todas las rondas de votación
- Muestra: título, año, team, nº actual de candidatos en esa ronda

**Paso 2: Confirmar fetch desde CRM**
- Botón "Traer personas de SinergiaCRM"
- Spinner + mensaje mientras carga (puede tardar 5-10s con muchos datos)

**Paso 3: Revisar y seleccionar**
- Accordion agrupado por **MCM Local** (`location`)
- Dentro de cada grupo: tabla con columnas ✓ | Nombre | Apellidos | Edad | DNI | Etapa | Asamblea (mov) | Asamblea (resp) | Monitor desde | Monitor de
- **Paginación en memoria:** 50 por página
- **Controles:** Seleccionar todos / Ninguno / Buscador por nombre/DNI / Contador
- **Badge:** "Ya importado" si `crm_id` existe en la ronda elegida

**Paso 4: Importar (progreso)**
- Barra de progreso lineal
- "Importando X candidatos a la votación «Título»..."

**Paso 5: Éxito**
- Resumen: "Importados: N | Ya existían: M | Total: X"
- Botón "Volver a elegir votación" para reiniciar wizard

---

## 🗄️ Base de Datos

### Migración aplicada

**Archivo:** `supabase/sqls/add-crm-fields-to-candidates.sql`

Añadió **10 columnas** a la tabla `candidates`:

| Columna | Tipo | Propósito |
|---------|------|----------|
| `crm_id` | TEXT | Identificador único del CRM (clave única por round) |
| `dni` | TEXT | Número de identificación (opcional) |
| `birthdate` | DATE | Fecha de nacimiento |
| `etapa` | TEXT | Etapa MCM (MIC/COM/LC) |
| `asamblea_movimiento_es` | TEXT | "Para mí el Movimiento es..." |
| `asamblea_responsabilidad` | TEXT | Responsabilidades asumidas |
| `monitor_desde` | TEXT | Año en que es monitor/a (aproximado) |
| `monitor_de` | TEXT | Tipo de monitor: MIC/COM/LC/apoyo/otros |
| `grupo_mcm` | TEXT | Futuro: nombre de grupo vía relaciones |
| `crm_source` | TEXT | Origen: 'sinergiacrm' \| 'manual' \| 'csv' |

### Índice único
```sql
CREATE UNIQUE INDEX candidates_round_crm_id_uniq
  ON public.candidates(round_id, crm_id)
  WHERE crm_id IS NOT NULL;
```

**Previene duplicados:** No puedes importar la misma persona (mismo `crm_id`) dos veces a la misma votación.

---

## 🔄 Mapeo de Campos CRM → Candidatos

| Campo CRM | Columna `candidates` | Descripción |
|-----------|----------------------|-------------|
| `id` | `crm_id` | ID único del contacto |
| `first_name` | `name` | Nombre propio |
| `last_name` | `surname` | Apellidos |
| `stic_identification_number_c` | `dni` | DNI/NIE |
| `birthdate` | `birthdate` | Fecha de nacimiento |
| `stic_age_c` | `age` | Edad (calculada del CRM) |
| `assigned_user_name` | `location` | MCM Local asignado |
| `ajmcm_etapa_c` | `etapa` | Etapa del candidato |
| `ajmcm_asamblea_movimiento_es_c` | `asamblea_movimiento_es` | Pregunta asamblea 1 |
| `ajmcm_asamblea_responsabilid_c` | `asamblea_responsabilidad` | Pregunta asamblea 2 |
| `ajmcm_monitor_desde_c` | `monitor_desde` | Año monitor/a |
| `ajmcm_monitor_de_c` | `monitor_de` | Tipo de monitor/a |

**Campo crítico:** `assigned_user_name` → `location` (usado para agrupar en el UI)

---

## 🚀 Guía de Configuración

### Paso 1: Configurar Secrets en Supabase

**Opción A: Dashboard (UI)**
1. Ve a https://supabase.com/dashboard/project/sjhxhsdckvungsrbquve/functions
2. Busca **Edge Functions** → **crm-proxy** (o crea si no existe)
3. Click en **Settings** → **Secrets**
4. Añade estas 3 variables:
   - `SINERGIA_URL` = `https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php`
   - `SINERGIA_USER` = `api_user`
   - `SINERGIA_PASS` = `w780kAp6GeG&EEffJBe0iVa)`
5. Click **Save**

**Opción B: CLI (si tienes `supabase` CLI instalado)**
```bash
supabase link --project-ref sjhxhsdckvungsrbquve
supabase secrets set \
  SINERGIA_URL='https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php' \
  SINERGIA_USER='api_user' \
  SINERGIA_PASS='w780kAp6GeG&EEffJBe0iVa)'
```

### Paso 2: Verificar Conectividad

En la consola del navegador (F12), desde la ruta `/comunica`:
```javascript
await supabase.functions.invoke('crm-proxy', {
  body: { action: 'list-contacts' }
})
```

Espera: `{ ok: true, contacts: [...], total: N }`

Si error: Revisa con:
```javascript
// Supabase dashboard → Logs → Edge Functions
```

### Paso 3: Aplicar Migración BBDD

Si aún no lo has hecho:
```bash
# Opción 1: Vía CLI
supabase db push

# Opción 2: Vía SQL Editor (Supabase dashboard)
# Copia el contenido de supabase/sqls/add-crm-fields-to-candidates.sql
# Pégalo en https://supabase.com/dashboard/project/.../sql
```

Verifica con:
```sql
\d candidates  -- Listar columnas
```

---

## 📋 Workflow Completo (Paso a Paso)

### Para usuarios finales (admins)

1. **Acceder:** Va a `/comunica` en el navegador
2. **Autenticarse:** Entra con email + contraseña admin
3. **Seleccionar votación:**
   - Abre dropdown
   - Elige la ronda a la que quieres importar candidatos
   - Nota cuántos candidatos ya hay importados
4. **Buscar en CRM:**
   - Click "Traer personas de SinergiaCRM"
   - Espera spinner + "Esto puede tardar unos segundos"
   - Se descarga **todas las personas** del CRM
5. **Revisar y seleccionar:**
   - Ve un accordion con MCM Locales (ej. MCM Castellón, MCM Valencia, etc.)
   - Dentro cada uno, tabla paginada con 50 registros
   - Marca ✓ en los que quieras importar
   - Usa buscador (nombre/DNI) si necesitas filtrar
   - Click "Seleccionar todos" o "Ninguno" para operaciones masivas
6. **Confirmar e importar:**
   - Mira el contador: "X de Y seleccionados"
   - Click "Importar X candidatos a la votación «Título»"
   - Espera barra de progreso
7. **Ver resultado:**
   - Resumen: "Importados: N | Ya existían: M"
   - Click "Volver a elegir votación" si quieres importar a otra ronda

### Para desarrolladores (integración)

```typescript
// 1. Traer datos
import { fetchAllCRMContacts } from "@/lib/sinergiaCRM";

const contacts = await fetchAllCRMContacts();
// Devuelve: CRMContact[] ordenado por (location, age ASC)

// 2. Agrupar (opcional, lo hace el componente)
import { groupByLocation } from "@/lib/sinergiaCRM";

const grouped = groupByLocation(contacts);
// Devuelve: CRMContactGroup[] { location, contacts[] }

// 3. Insertar a BBDD
const { data: inserted } = await supabase
  .from("candidates")
  .insert(batch)
  .select("id");
```

---

## 🐛 Troubleshooting

### Error: "El proxy CRM devolvió un error desconocido"
**Causa:** Edge Function retornó `{ ok: false, error: "..." }`

**Pasos:**
1. Supabase dashboard → Logs → Edge Functions → crm-proxy
2. Busca error reciente
3. Verifica secrets están correctos (sin espacios, sin comillas extras)

### Error: "Supabase no configurado"
**Causa:** `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` falta en `.env.local`

**Solución:**
```bash
cat > .env.local << EOF
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
EOF
```

### Timeout o lentitud extrema
**Causa:** SinergiaCRM tiene muchos contactos (~1000+) o conexión lenta

**Solución:**
- Aumentar timeout en `index.ts` (Edge Function max es 50s)
- O paginar desde el CRM (requiere cambios en `fetchAllContacts`)

### Duplicados importados a pesar del índice
**Causa:** El índice único está desactivado o hay `crm_id` NULL

**Verificar:**
```sql
SELECT * FROM candidates WHERE round_id = '...' AND crm_id IS NOT NULL
GROUP BY crm_id HAVING COUNT(*) > 1;
```

---

## 🔮 Futuro (Fase 2+)

### Credenciales por usuario
En lugar de secrets de función, permitir que cada admin ingrese sus propias credenciales CRM:
- Guardar en `sessionStorage` (no persistir)
- Pasar en body: `{ action: 'list-contacts', user, pass }`

### Importación desde relaciones
Traer `grupo_mcm` automáticamente vía `stic_Contacts_Relationships`:
- Nuevo endpoint: `{ action: 'list-groups' }`
- Rellenar `candidates.grupo_mcm` al importar

### Fotos
- Descargar fotos y guardarlas con nombre `<DNI>.jpg`
- Rellenar `image_url` automáticamente

### Tipado avanzado
- Actualizar `Database` en `src/lib/supabase.ts`
- Generar tipos con `supabase gen types typescript`

---

## 📁 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/components/ComunicaRouter.tsx` | Router principal (protección auth) |
| `src/components/ComunicaImport.tsx` | Componente wizard principal (~700 líneas) |
| `src/lib/sinergiaCRM.ts` | Cliente TypeScript del CRM |
| `supabase/functions/crm-proxy/index.ts` | Edge Function proxy |
| `supabase/sqls/add-crm-fields-to-candidates.sql` | Migración BBDD |
| `docs/crm-reference/CAMPOS_SINERGIA_CRM.md` | Referencia de campos CRM |

---

## ✅ Checklist de Implementación

- [x] Migración BBDD aplicada (`add-crm-fields-to-candidates.sql`)
- [x] Edge Function desplegada (`crm-proxy`)
- [x] Secrets configurados en Supabase
- [x] Cliente TypeScript (`sinergiaCRM.ts`)
- [x] Router protegido (`ComunicaRouter.tsx`)
- [x] Componente wizard (`ComunicaImport.tsx`)
- [x] Ruta registrada en `App.tsx` (`/comunica/*`)
- [x] Documentación completa

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa `docs/crm-reference/CAMPOS_SINERGIA_CRM.md` para referencia de campos
2. Consulta los logs de Supabase (dashboard → Logs → Edge Functions)
3. Verifica conectividad desde consola: `supabase.functions.invoke('crm-proxy', ...)`
4. Pregunta al equipo técnico si persisten problemas
