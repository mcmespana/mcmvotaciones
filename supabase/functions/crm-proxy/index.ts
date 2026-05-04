// Supabase Edge Function: crm-proxy
// Actúa de proxy entre la SPA y SinergiaCRM para evitar CORS y ocultar credenciales.
// Deno runtime

const CRM_URL = Deno.env.get('SINERGIA_URL') ?? '';
const CRM_USER_SECRET = Deno.env.get('SINERGIA_USER') ?? '';
const CRM_PASS_SECRET = Deno.env.get('SINERGIA_PASS') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// CRM helpers
// ---------------------------------------------------------------------------

async function crmCall(method: string, params: unknown, allowEmpty = false): Promise<Record<string, unknown> | null> {
  if (!CRM_URL) throw new Error('CRM URL not configured (SINERGIA_URL)');

  const body = new URLSearchParams();
  body.set('method', method);
  body.set('input_type', 'JSON');
  body.set('response_type', 'JSON');
  body.set('rest_data', JSON.stringify(params));

  const res = await fetch(CRM_URL, { method: 'POST', body });
  const rawText = await res.text();

  if (!res.ok) {
    const detail = rawText.trim().slice(0, 200);
    throw new Error(detail ? `CRM ${method} HTTP ${res.status}: ${detail}` : `CRM ${method} HTTP ${res.status}`);
  }

  const text = rawText.trim();
  if (!text) {
    if (allowEmpty) return null;
    throw new Error(`CRM ${method} returned empty response body`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const detail = text.slice(0, 200);
    throw new Error(`CRM ${method} returned invalid JSON: ${detail}`);
  }
}

async function crmLogin(user: string, pass: string): Promise<string> {
  const res = await crmCall('login', {
    user_auth: {
      user_name: user,
      password: pass,
      encryption: 'PLAIN',
    },
    application: 'mcmvotaciones',
  });
  if (!res?.id || typeof res.id !== 'string') {
    throw new Error(`CRM login failed: ${JSON.stringify(res)}`);
  }
  return res.id;
}

const SELECT_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'birthdate',
  'stic_age_c',
  'stic_identification_number_c',
  'assigned_user_name',
  'ajmcm_etapa_c',
  'ajmcm_asamblea_movimiento_es_c',
  'ajmcm_asamblea_responsabilid_c',
  'ajmcm_monitor_desde_c',
  'ajmcm_monitor_de_c',
  'stic_relationship_type_c',
];

interface CRMEntryList {
  entry_list?: Array<{
    id: string;
    name_value_list?: Record<string, { name: string; value: string }>;
  }>;
}

async function fetchAllContacts(session: string): Promise<Record<string, string>[]> {
  const all: Record<string, string>[] = [];
  let offset = 0;
  const maxResults = 200;

  while (true) {
    const res = await crmCall('get_entry_list', {
      session,
      module_name: 'Contacts',
      query: '',
      order_by: 'last_name',
      offset,
      select_fields: SELECT_FIELDS,
      link_name_to_fields_array: [],
      max_results: maxResults,
      deleted: 0,
      favorites: '',
    }) as CRMEntryList;

    const list = res?.entry_list ?? [];
    if (!list.length) break;

    for (const entry of list) {
      const flat: Record<string, string> = {};
      for (const [key, obj] of Object.entries(entry.name_value_list ?? {})) {
        flat[key] = obj?.value ?? '';
      }
      all.push(flat);
    }

    offset += list.length;
    if (list.length < maxResults) break;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Photo helpers
// ---------------------------------------------------------------------------

const CRM_IMAGE_FIELD = 'photo';

interface CRMImageResponse {
  image_data?: {
    data?: string;
    mime_type?: string;
  };
}

function decodeBase64Image(data: string): Uint8Array | null {
  try {
    const normalized = data.replace(/\s+/g, '');
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PhotoFetchResult = 
  | { status: 'success'; bytes: Uint8Array; contentType: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

async function fetchPhotoBytes(
  crmId: string,
  session: string,
): Promise<PhotoFetchResult> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await crmCall('get_entry', {
        session,
        module_name: 'Contacts',
        id: crmId,
        select_fields: ['photo'],
        link_name_to_fields_array: [],
      }, true) as { entry_list?: Array<{ name_value_list?: { photo?: { value?: string } } }> } | null;

      const photoValue = res?.entry_list?.[0]?.name_value_list?.photo?.value;
      if (!photoValue) {
           return { status: 'skipped', reason: 'El contacto no tiene foto en el CRM (campo photo vacío)' };
      }
      
      const imageRes = await crmCall('get_image', {
        session,
        image_data: {
          id: crmId,
          field: CRM_IMAGE_FIELD,
        },
      }, true) as CRMImageResponse | null;

      if (!imageRes) return { status: 'skipped', reason: 'get_image devolvió null' };

      const base64Data = imageRes.image_data?.data?.trim();
      const contentType = imageRes.image_data?.mime_type?.trim() ?? '';

      if (!base64Data) {
        return { status: 'skipped', reason: 'Sin datos base64 en get_image' };
      }
      if (!contentType.startsWith('image/')) {
        return { status: 'skipped', reason: `El tipo de contenido no es imagen: ${contentType}` };
      }

      const bytes = decodeBase64Image(base64Data);
      if (!bytes) {
         return { status: 'error', reason: 'Fallo al decodificar base64' };
      }
      if (bytes.length < 100) {
        return { status: 'skipped', reason: 'Imagen demasiado pequeña (<100 bytes)' };
      }

      return { status: 'success', bytes, contentType };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable = message.includes('HTTP 429') || message.includes('empty');

      if (!isRetryable || attempt === maxAttempts) {
        return { status: 'error', reason: message };
      }

      await sleep(400 * attempt);
    }
  }

  return { status: 'error', reason: 'Superó los intentos máximos' };
}

async function uploadToStorage(roundId: string, crmId: string, bytes: Uint8Array, contentType: string, authHeader: string): Promise<string> {
  if (!SUPABASE_URL) throw new Error('Supabase URL no configurada');
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${roundId}/${crmId}.${ext}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/candidate-photos/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader, // Usamos el token del administrador que invocó la función
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en Supabase Storage (${res.status}): ${errorText}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/candidate-photos/${path}`;
}

async function updateCandidateImageUrl(candidateId: string, imageUrl: string, authHeader: string): Promise<void> {
  if (!SUPABASE_URL) return;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': authHeader,
      'apikey': anonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
}

async function processPhotosInChunks(
  candidates: Array<{ id: string; crm_id: string }>,
  roundId: string,
  session: string,
  authHeader: string,
  chunkSize = 1,
): Promise<{ uploaded: number; failed: number; skipped: number; results: Record<string, string | null>; details: Record<string, string> }> {
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const results: Record<string, string | null> = {};
  const details: Record<string, string> = {};

  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async ({ id, crm_id }) => {
      let photoRes: PhotoFetchResult;

      try {
        photoRes = await fetchPhotoBytes(crm_id, session);
      } catch (err) {
        photoRes = { status: 'error', reason: err instanceof Error ? err.message : String(err) };
      }

      if (photoRes.status === 'error') {
        results[crm_id] = null;
        details[crm_id] = photoRes.reason;
        failed++;
        return;
      }

      if (photoRes.status === 'skipped') {
        results[crm_id] = null;
        details[crm_id] = photoRes.reason;
        skipped++;
        return;
      }

      let publicUrl: string;
      try {
        publicUrl = await uploadToStorage(roundId, crm_id, photoRes.bytes, photoRes.contentType, authHeader);
      } catch (uploadErr) {
        results[crm_id] = null;
        details[crm_id] = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        failed++;
        return;
      }
      
      await updateCandidateImageUrl(id, publicUrl, authHeader);
      results[crm_id] = publicUrl;
      details[crm_id] = 'OK';
      uploaded++;
    }));
  }

  return { uploaded, failed, skipped, results, details };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json() as {
      action?: string;
      user?: string;
      pass?: string;
      crm_ids?: string[];
      candidate_ids?: string[];
      round_id?: string;
      crm_id?: string;
    };
    const { action, user: bodyUser, pass: bodyPass } = body;

    const loginUser = bodyUser?.trim() || CRM_USER_SECRET;
    const loginPass = bodyPass?.trim() || CRM_PASS_SECRET;

    if (!loginUser || !loginPass) {
      return new Response(
        JSON.stringify({ ok: false, error: 'CRM credentials not configured (SINERGIA_USER / SINERGIA_PASS)' }),
        { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    // ── list-contacts ──────────────────────────────────────────────────────
    if (action === 'list-contacts') {
      const session = await crmLogin(loginUser, loginPass);
      const contacts = await fetchAllContacts(session);
      crmCall('logout', { session }).catch(() => {});
      return new Response(
        JSON.stringify({ ok: true, contacts, total: contacts.length }),
        { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    // ── fetch-photos ───────────────────────────────────────────────────────
    if (action === 'fetch-photos') {
      const { crm_ids, candidate_ids, round_id } = body;
      if (!round_id || !crm_ids?.length || !candidate_ids?.length) {
        return new Response(
          JSON.stringify({ ok: false, error: 'fetch-photos requires round_id, crm_ids[], candidate_ids[]' }),
          { status: 400, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
        );
      }
      if (crm_ids.length !== candidate_ids.length) {
        return new Response(
          JSON.stringify({ ok: false, error: 'crm_ids and candidate_ids must have same length' }),
          { status: 400, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
        );
      }

      const restSession = await crmLogin(loginUser, loginPass);

      const authHeaderClient = req.headers.get('Authorization') || `Bearer ${SUPABASE_SERVICE_KEY}`;

      const candidates = crm_ids.map((crm_id, i) => ({ crm_id, id: candidate_ids[i] }));
      const result = await processPhotosInChunks(candidates, round_id, restSession, authHeaderClient);
      crmCall('logout', { session: restSession }).catch(() => {});

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
