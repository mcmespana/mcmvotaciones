# Integración SinergiaCRM — Guía técnica completa

> Documentación extraída de la integración real en **MCM Votaciones** (`mcmespana/mcmvotaciones`).
> Sirve como referencia para replicar la conexión con SinergiaCRM en cualquier otro proyecto.

---

## Arquitectura general

```
SPA (React / cualquier framework)
  └─► Supabase Edge Function "crm-proxy" (Deno)
        └─► SinergiaCRM REST API v4.1
              URL: https://tu-crm.org/custom/service/v4_1_SticCustom/rest.php
```

El frontend **nunca llama directamente al CRM**. Todo pasa por un edge function que actúa como proxy para:

1. Evitar CORS (el CRM no permite llamadas cross-origin desde el browser)
2. Ocultar credenciales (se guardan como secrets de Supabase, nunca en el cliente)
3. Las credenciales también pueden viajar en el body de la request como override para admins

---

## 1. Autenticación

Todas las llamadas son `POST` con `URLSearchParams`. El login devuelve un `session_id` temporal.

```typescript
// Patrón genérico para CUALQUIER llamada al CRM
async function crmCall(method: string, params: unknown): Promise<Record<string, unknown> | null> {
  const CRM_URL = 'https://tu-crm.org/custom/service/v4_1_SticCustom/rest.php';

  const body = new URLSearchParams();
  body.set('method', method);
  body.set('input_type', 'JSON');
  body.set('response_type', 'JSON');
  body.set('rest_data', JSON.stringify(params));

  const res = await fetch(CRM_URL, { method: 'POST', body });
  const text = await res.text();
  return JSON.parse(text);
}

// Login → devuelve session_id (string)
async function crmLogin(user: string, pass: string): Promise<string> {
  const res = await crmCall('login', {
    user_auth: { user_name: user, password: pass, encryption: 'PLAIN' },
    application: 'mi-app',
  });
  return res.id; // ← session_id para todas las llamadas siguientes
}

// Siempre hacer logout al terminar
crmCall('logout', { session: sessionId }).catch(() => {});
```

---

## 2. Obtener contactos con paginación

```typescript
const SELECT_FIELDS = [
  'id', 'first_name', 'last_name', 'birthdate', 'stic_age_c',
  'stic_identification_number_c', 'assigned_user_name', 'ajmcm_etapa_c',
  'ajmcm_asamblea_movimiento_es_c', 'ajmcm_asamblea_responsabilid_c',
  'ajmcm_monitor_desde_c', 'ajmcm_monitor_de_c', 'ajmcm_grupotemp_c',
  'stic_relationship_type_c',
];

async function fetchAllContacts(session: string): Promise<Record<string, string>[]> {
  const all: Record<string, string>[] = [];
  let offset = 0;

  while (true) {
    const res = await crmCall('get_entry_list', {
      session,
      module_name: 'Contacts',
      query: '',          // vacío = todos; acepta SQL-like: "contacts_cstm.ajmcm_etapa_c = 'MIC'"
      order_by: 'last_name',
      offset,
      select_fields: SELECT_FIELDS,
      link_name_to_fields_array: [],
      max_results: 200,   // máximo por página
      deleted: 0,
      favorites: '',
    });

    const list = res?.entry_list ?? [];
    if (!list.length) break;

    // Aplanar el name_value_list a un objeto plano key → value
    for (const entry of list) {
      const flat: Record<string, string> = {};
      for (const [key, obj] of Object.entries(entry.name_value_list ?? {})) {
        flat[key] = obj?.value ?? '';
      }
      all.push(flat);
    }

    offset += list.length;
    if (list.length < 200) break; // última página
  }

  return all;
}
```

### Formato de respuesta del CRM

```json
{
  "entry_list": [
    {
      "id": "abc-123",
      "name_value_list": {
        "first_name":              { "name": "first_name",              "value": "Juan" },
        "ajmcm_etapa_c":           { "name": "ajmcm_etapa_c",           "value": "COM" },
        "stic_relationship_type_c":{ "name": "stic_relationship_type_c","value": "^grupo^,^monitor^" }
      }
    }
  ]
}
```

**Dos gotchas importantes:**
- Los valores llevan entidades HTML (`&amp;`, `&quot;`, etc.) — hay que decodificar
- `stic_relationship_type_c` viene como `"^grupo^,^monitor^"` — parsear con regex (ver sección 3)

---

## 3. Normalización de datos

```typescript
function decodeHTML(s: string | undefined): string {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// "^grupo^,^monitor^" → ["grupo", "monitor"]
function parseRelationshipTypes(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map(s => s.replace(/\^/g, '').trim().toLowerCase()).filter(Boolean);
}

interface CRMContact {
  crm_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  dni: string | null;
  birthdate: string | null;      // YYYY-MM-DD
  age: number | null;
  location: string | null;       // assigned_user_name → "MCM Castellón", "MCM Madrid"…
  etapa: string | null;          // "MIC" | "COM" | "LC"
  asamblea_movimiento_es: string | null;
  asamblea_responsabilidad: string | null;
  monitor_desde: string | null;  // año como string, ej: "2019"
  monitor_de: string | null;     // "MIC" | "COM" | "LC" | "Apoyo" | "Otros"
  grupo: string | null;          // texto libre
  relationship_types: string[];  // ["grupo", "monitor", …]
}

function normalize(raw: Record<string, string>): CRMContact {
  const d = (s?: string) => decodeHTML(s);
  const n = (s?: string): string | null => { const v = decodeHTML(s)?.trim(); return v || null; };
  const ageRaw = n(raw['stic_age_c']);

  return {
    crm_id:                  d(raw['id']),
    first_name:              d(raw['first_name']),
    last_name:               d(raw['last_name']),
    full_name:               `${d(raw['first_name'])} ${d(raw['last_name'])}`.trim(),
    dni:                     n(raw['stic_identification_number_c']),
    birthdate:               n(raw['birthdate']),
    age:                     ageRaw ? (Number(ageRaw) || null) : null,
    location:                n(raw['assigned_user_name']),
    etapa:                   n(raw['ajmcm_etapa_c']),
    asamblea_movimiento_es:  n(raw['ajmcm_asamblea_movimiento_es_c']),
    asamblea_responsabilidad:n(raw['ajmcm_asamblea_responsabilid_c']),
    monitor_desde:           n(raw['ajmcm_monitor_desde_c']),
    monitor_de:              n(raw['ajmcm_monitor_de_c']),
    grupo:                   n(raw['ajmcm_grupotemp_c']),
    relationship_types:      parseRelationshipTypes(raw['stic_relationship_type_c']),
  };
}
```

---

## 4. Fotos de contacto

```typescript
// Descargar foto de un contacto desde el CRM
async function fetchPhotoBytes(crmId: string, session: string) {
  const res = await crmCall('get_image', {
    session,
    image_data: { id: crmId, field: 'photo' },
  });

  const base64 = res?.image_data?.data?.trim();
  const contentType = res?.image_data?.mime_type?.trim() ?? '';

  if (!base64 || !contentType.startsWith('image/')) return null;

  // Decodificar base64 → Uint8Array
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  if (bytes.length < 100) return null; // imagen vacía o corrupta
  return { bytes, contentType };
}

// Subir a Supabase Storage con upsert (bucket: "candidate-photos", path: "shared/{crm_id}.ext")
async function uploadToStorage(
  crmId: string, bytes: Uint8Array, contentType: string,
  supabaseUrl: string, serviceKey: string,
): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `shared/${crmId}.${ext}`;

  await fetch(`${supabaseUrl}/storage/v1/object/candidate-photos/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': contentType,
      'x-upsert': 'true', // sobrescribe si ya existe
    },
    body: bytes,
  });

  return `${supabaseUrl}/storage/v1/object/public/candidate-photos/${path}`;
}

// Caché: comprobar si la foto ya existe en Storage antes de descargar del CRM
async function findExistingPhoto(crmId: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/list/candidate-photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: 'shared/', search: crmId, limit: 1 }),
  });
  const files = await res.json();
  if (!files.length) return null;
  return `${supabaseUrl}/storage/v1/object/public/candidate-photos/shared/${files[0].name}`;
}
```

**Patrón de uso recomendado para fotos** (con caché):

```typescript
// 1. Buscar en Storage primero
const existing = await findExistingPhoto(crm_id, SUPABASE_URL, SERVICE_KEY);
if (existing) {
  // ya tenemos la foto, sólo actualizar la URL en DB
  await updateImageUrl(crm_id, existing);
  return;
}

// 2. Si no existe, descargar del CRM y subir
const photo = await fetchPhotoBytes(crm_id, session);
if (photo) {
  const publicUrl = await uploadToStorage(crm_id, photo.bytes, photo.contentType, ...);
  await updateImageUrl(crm_id, publicUrl);
}
```

---

## 5. Edge Function completa (Supabase / Deno)

La función acepta dos acciones en el body:

| `action` | Descripción |
|----------|-------------|
| `list-contacts` | Login + get_entry_list paginado + logout |
| `fetch-photos` | Login + get_image para cada crm_id + subir a Storage + actualizar DB + logout |

```typescript
// supabase/functions/crm-proxy/index.ts
const CRM_URL          = Deno.env.get('SINERGIA_URL') ?? '';
const CRM_USER_SECRET  = Deno.env.get('SINERGIA_USER') ?? '';
const CRM_PASS_SECRET  = Deno.env.get('SINERGIA_PASS') ?? '';
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const body = await req.json();
    const { action, user: bodyUser, pass: bodyPass } = body;

    // Credenciales: override en body, fallback a secrets
    const loginUser = bodyUser?.trim() || CRM_USER_SECRET;
    const loginPass = bodyPass?.trim() || CRM_PASS_SECRET;

    if (!loginUser || !loginPass) {
      return new Response(
        JSON.stringify({ ok: false, error: 'CRM credentials not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    if (action === 'list-contacts') {
      const session = await crmLogin(loginUser, loginPass);
      const contacts = await fetchAllContacts(session);
      crmCall('logout', { session }).catch(() => {});
      return new Response(
        JSON.stringify({ ok: true, contacts, total: contacts.length }),
        { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    if (action === 'fetch-photos') {
      const { crm_ids, candidate_ids, round_id } = body;
      const session = await crmLogin(loginUser, loginPass);
      const candidates = crm_ids.map((crm_id: string, i: number) => ({ crm_id, id: candidate_ids[i] }));
      const result = await processPhotosInChunks(candidates, session); // chunks de 10
      crmCall('logout', { session }).catch(() => {});
      return new Response(
        JSON.stringify({ ok: true, ...result }),
        { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    );
  }
});
```

**Variables de entorno necesarias en Supabase → Project Settings → Edge Functions:**

| Variable | Valor |
|----------|-------|
| `SINERGIA_URL` | URL completa hasta `/rest.php` |
| `SINERGIA_USER` | usuario CRM |
| `SINERGIA_PASS` | contraseña CRM |

**Despliegue:**

```bash
supabase functions deploy crm-proxy
supabase secrets set SINERGIA_URL=https://tu-crm.org/custom/service/v4_1_SticCustom/rest.php
supabase secrets set SINERGIA_USER=usuario
supabase secrets set SINERGIA_PASS=contraseña
```

---

## 6. Cliente frontend (TypeScript)

```typescript
// src/lib/sinergiaCRM.ts
import { supabase } from './supabase'; // cliente Supabase inicializado normalmente

export async function fetchAllCRMContacts(credentials?: { user?: string; pass?: string }): Promise<CRMContact[]> {
  const body: Record<string, string> = { action: 'list-contacts' };
  if (credentials?.user) body.user = credentials.user;
  if (credentials?.pass) body.pass = credentials.pass;

  const { data, error } = await supabase.functions.invoke('crm-proxy', { body });
  if (error) throw new Error(`Error proxy CRM: ${error.message}`);
  if (!data?.ok) throw new Error(data?.error ?? 'Error desconocido');

  return (data.contacts ?? []).map(normalize).filter((c: CRMContact) => c.crm_id);
}

export async function fetchCRMPhotos(
  candidates: Array<{ crm_id: string; candidate_id: string }>,
  roundId: string,
  credentials?: { user?: string; pass?: string },
) {
  const batchSize = 20;
  const batches: typeof candidates[] = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  const results = await Promise.all(batches.map(batch => {
    const body: Record<string, unknown> = {
      action: 'fetch-photos',
      crm_ids: batch.map(c => c.crm_id),
      candidate_ids: batch.map(c => c.candidate_id),
      round_id: roundId,
      ...(credentials?.user ? { user: credentials.user, pass: credentials.pass } : {}),
    };
    return supabase.functions.invoke('crm-proxy', { body }).then(({ data }) => data);
  }));

  return results.reduce(
    (acc, r) => ({ uploaded: acc.uploaded + (r?.uploaded ?? 0), failed: acc.failed + (r?.failed ?? 0) }),
    { uploaded: 0, failed: 0 },
  );
}
```

---

## 7. Esquema DB — campos CRM en la tabla de destino

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS crm_id                  TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS dni                     TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS birthdate               DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS etapa                   TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS asamblea_movimiento_es  TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS asamblea_responsabilidad TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS monitor_desde           TEXT; -- año, ej: "2019"
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS monitor_de              TEXT; -- MIC/COM/LC/Apoyo/Otros
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS grupo_mcm               TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS crm_source              TEXT; -- 'sinergiacrm' | 'manual' | 'csv'
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS crm_relationship_types  TEXT; -- 'grupo,monitor'
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS image_url               TEXT;

-- Índice único: evita duplicados del mismo crm_id en el mismo contexto (round/evento/etc.)
CREATE UNIQUE INDEX IF NOT EXISTS candidates_round_crm_id
  ON candidates(round_id, crm_id)
  WHERE crm_id IS NOT NULL;
```

---

## 8. Mapeo completo campos CRM → DB

| Campo CRM | Campo DB | Notas |
|-----------|----------|-------|
| `id` | `crm_id` | UUID del CRM |
| `first_name` | `name` | |
| `last_name` | `surname` | |
| `assigned_user_name` | `location` | "MCM Castellón", "MCM Madrid"… |
| `stic_age_c` | `age` | Calculado automáticamente por el CRM |
| `birthdate` | `birthdate` | Formato YYYY-MM-DD |
| `stic_identification_number_c` | `dni` | DNI/NIE |
| `ajmcm_etapa_c` | `etapa` | `MIC` / `COM` / `LC` |
| `ajmcm_asamblea_movimiento_es_c` | `asamblea_movimiento_es` | texto libre |
| `ajmcm_asamblea_responsabilid_c` | `asamblea_responsabilidad` | texto libre |
| `ajmcm_monitor_desde_c` | `monitor_desde` | año (string) — campo puente en Relación Personas |
| `ajmcm_monitor_de_c` | `monitor_de` | `MIC`/`COM`/`LC`/`Apoyo`/`Otros` — campo puente |
| `ajmcm_grupotemp_c` | `grupo_mcm` | texto libre |
| `stic_relationship_type_c` | `crm_relationship_types` | `"^grupo^,^monitor^"` → `"grupo,monitor"` |

---

## 9. Lógica de importación (flujo UI)

El wizard tiene 6 pasos:

```
1. select-round   → elegir destino + credenciales + filtrar por relationship_types
2. confirm-fetch  → disparar fetchAllCRMContacts()
3. review         → tabla agrupada por location, checkboxes, búsqueda por nombre/DNI
4. importing      → insert en batches de 100 rows (skip duplicados por crm_id)
5. photos         → fetchCRMPhotos() automático justo después del import
6. done           → resumen: inserted / skipped / fotos importadas
```

Las credenciales se guardan en `sessionStorage` (no `localStorage`, para que no persistan entre sesiones):

```typescript
sessionStorage.setItem('crm_user', crmUser);
sessionStorage.setItem('crm_pass', crmPass);
// recuperar al iniciar componente:
const crmUser = sessionStorage.getItem('crm_user') ?? '';
```

Deduplicación antes del insert:

```typescript
// Comprobar qué crm_ids ya existen en el destino
const { data: existing } = await supabase
  .from('candidates')
  .select('crm_id')
  .eq('round_id', selectedRoundId)
  .not('crm_id', 'is', null);

const alreadyExists = new Set(existing.map(e => e.crm_id));
const newRows = rows.filter(r => !alreadyExists.has(r.crm_id));
const skipped = rows.length - newRows.length;

// Insert en batches de 100
for (let i = 0; i < newRows.length; i += 100) {
  const { data } = await supabase.from('candidates').insert(newRows.slice(i, i + 100)).select('id, crm_id');
  // guardar los IDs devueltos para luego fetchear fotos
}
```

Filtro de relationship_types en el review:

```typescript
const DEFAULT_RELATIONSHIP_TYPES = ['grupo', 'monitor'];

// Pre-seleccionar sólo los que coinciden con el filtro (excluir "Asesora")
const preSelected = contacts.filter(c =>
  c.etapa?.toLowerCase() !== 'asesora' &&
  c.relationship_types.some(rt => selectedRelTypes.includes(rt)),
);
```

---

## 10. Notas sobre campos específicos MCM

### Campos puente (`monitor_desde` / `monitor_de`)

Técnicamente viven en el módulo `stic_Contacts_Relationships` (Relación Personas), pero el CRM los expone directamente en el contacto como `ajmcm_monitor_desde_c` / `ajmcm_monitor_de_c` al usar `get_entry_list` sobre `Contacts`. **No hace falta una segunda llamada.**

### `stic_relationship_type_c` — selección múltiple

Valores habituales en MCM: `grupo`, `monitor`. Formato en la API: `"^grupo^,^monitor^"`. Parsear siempre con `parseRelationshipTypes`.

### `assigned_user_name` — delegación local

Es el nombre del usuario CRM asignado al contacto. Cada MCM Local tiene un usuario propio. Valores esperados:

| Valor campo | Etiqueta |
|-------------|----------|
| MCM Benicarló-Vinaròs | MCM Benicarló-Vinaròs |
| MCM Burriana | MCM Burriana |
| MCM Caravaca | MCM Caravaca |
| MCM Castellón | MCM Castellón |
| MCM Ciutadella | MCM Ciutadella |
| MCM Espinardo | MCM Espinardo |
| MCM Granada | MCM Granada |
| MCM Huétor-Santillán | MCM Huétor-Santillán |
| MCM L'Alcora | MCM L'Alcora |
| MCM Madrid | MCM Madrid |
| MCM Nules | MCM Nules |
| MCM Onda | MCM Onda |
| MCM Quintanar | MCM Quintanar |
| MCM Reus | MCM Reus |
| MCM Tortosa | MCM Tortosa |
| MCM Vila-real | MCM Vila-real |
| MCM Villacañas | MCM Villacañas |
| MCM Zaragoza | MCM Zaragoza |

### Fotos: caché en Storage

Las fotos se guardan en Supabase Storage bajo `candidate-photos/shared/{crm_id}.ext`. El path `shared/` es independiente de cualquier round o contexto: la misma foto sirve para todas las importaciones del mismo contacto. Antes de descargar del CRM, siempre comprobar si ya existe.

---

## 11. Otros métodos útiles de la API

| Método API | Uso |
|------------|-----|
| `get_entry_list` | Listar registros con filtros y paginación |
| `get_entry` | Obtener un registro por ID |
| `get_relationships` | Relaciones de un contacto (link fields) |
| `get_image` | Foto de un contacto (devuelve base64) |
| `get_available_modules` | Descubrir módulos disponibles |
| `get_module_fields` | Descubrir campos de un módulo |
| `set_entry` | Crear/actualizar registro |
| `set_relationship` | Crear relación entre registros |
| `logout` | Cerrar sesión |

Para explorar el CRM desde zero:

```javascript
// 1. Listar todos los módulos
const modules = await crmCall('get_available_modules', { session });

// 2. Ver campos de un módulo concreto
const fields = await crmCall('get_module_fields', { session, module_name: 'Contacts' });
const relFields = await crmCall('get_module_fields', { session, module_name: 'stic_Contacts_Relationships' });
```

---

## 12. Estructura de archivos mínima

```
mi-proyecto/
├── supabase/
│   └── functions/
│       └── crm-proxy/
│           └── index.ts        ← Edge function proxy (Deno) — BLOQUE CRÍTICO
├── src/
│   └── lib/
│       └── sinergiaCRM.ts      ← Cliente frontend (fetch + normalize + photos)
└── src/components/
    └── ComunicaImport.tsx      ← UI wizard de importación (opcional)
```

---

## 13. Referencias

- **Código fuente de referencia:** `mcmespana/mcmvotaciones`
  - `supabase/functions/crm-proxy/index.ts` — edge function completa
  - `src/lib/sinergiaCRM.ts` — cliente frontend completo
  - `src/components/admin/ComunicaImport.tsx` — wizard UI completo
  - `docs/crm-reference/CAMPOS_SINERGIA_CRM.md` — todos los campos del CRM
  - `docs/crm/DOC_API_CRM.md` — documentación API con ejemplos PHP y JS
- **API SuiteCRM v4.1:** https://docs.suitecrm.com/developer/api/api-v4.1-methods/
- **Wiki SinergiaCRM:** https://wiki.sinergiatic.org/index.php?title=Estructura_de_datos:_módulos_y_campos
