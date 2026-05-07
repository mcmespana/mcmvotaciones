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

async function crmCall(method: string, params: unknown): Promise<Record<string, unknown> | null> {
  if (!CRM_URL) throw new Error('CRM URL not configured (SINERGIA_URL)');

  const body = new URLSearchParams();
  body.set('method', method);
  body.set('input_type', 'JSON');
  body.set('response_type', 'JSON');
  body.set('rest_data', JSON.stringify(params));

  const res = await fetch(CRM_URL, { method: 'POST', body });
  const text = await res.text();

  if (!res.ok) throw new Error(`CRM ${method} HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`CRM ${method} returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

async function crmLogin(user: string, pass: string): Promise<string> {
  const res = await crmCall('login', {
    user_auth: { user_name: user, password: pass, encryption: 'PLAIN' },
    application: 'mcmvotaciones',
  });
  if (!res?.id || typeof res.id !== 'string') {
    throw new Error(`CRM login failed: ${JSON.stringify(res)}`);
  }
  return res.id;
}

const SELECT_FIELDS = [
  'id', 'first_name', 'last_name', 'birthdate', 'stic_age_c',
  'stic_identification_number_c', 'assigned_user_name', 'ajmcm_etapa_c',
  'ajmcm_asamblea_movimiento_es_c', 'ajmcm_asamblea_responsabilid_c',
  'ajmcm_monitor_desde_c', 'ajmcm_monitor_de_c', 'stic_relationship_type_c',
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

interface CRMImageResponse {
  image_data?: { data?: string; mime_type?: string };
}

type PhotoFetchResult =
  | { status: 'success'; bytes: Uint8Array; contentType: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

async function fetchPhotoBytes(crmId: string, session: string): Promise<PhotoFetchResult> {
  try {
    const res = await crmCall('get_image', {
      session,
      image_data: { id: crmId, field: 'photo' },
    }) as CRMImageResponse | null;

    const base64 = res?.image_data?.data?.trim();
    const contentType = res?.image_data?.mime_type?.trim() ?? '';

    if (!base64) return { status: 'skipped', reason: 'Sin foto en CRM' };
    if (!contentType.startsWith('image/')) return { status: 'skipped', reason: `Tipo no imagen: ${contentType}` };

    try {
      const binary = atob(base64.replace(/\s+/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length < 100) return { status: 'skipped', reason: 'Imagen <100 bytes' };
      return { status: 'success', bytes, contentType };
    } catch {
      return { status: 'error', reason: 'Fallo decodificando base64' };
    }
  } catch (err) {
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  }
}

async function uploadToStorage(roundId: string, crmId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase no configurado');
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${roundId}/${crmId}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/candidate-photos/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/candidate-photos/${path}`;
}

async function batchUpdateCandidateImageUrls(updates: Array<{ id: string; image_url: string }>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !updates.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/candidates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB update failed ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function processPhotosInChunks(
  candidates: Array<{ id: string; crm_id: string }>,
  roundId: string,
  session: string,
  chunkSize = 10,
): Promise<{ uploaded: number; failed: number; skipped: number; details: Record<string, string> }> {
  let uploaded = 0, failed = 0, skipped = 0;
  const details: Record<string, string> = {};

  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    const dbUpdates: Array<{ id: string; image_url: string }> = [];
    // id → crm_id mapping so we can set the right status after the batch DB update
    const idToCrmId: Record<string, string> = {};

    await Promise.all(chunk.map(async ({ id, crm_id }) => {
      const photoRes = await fetchPhotoBytes(crm_id, session);

      if (photoRes.status !== 'success') {
        details[crm_id] = photoRes.reason;
        photoRes.status === 'skipped' ? skipped++ : failed++;
        return;
      }

      try {
        const publicUrl = await uploadToStorage(roundId, crm_id, photoRes.bytes, photoRes.contentType);
        dbUpdates.push({ id, image_url: publicUrl });
        idToCrmId[id] = crm_id;
      } catch (err) {
        details[crm_id] = `Storage: ${err instanceof Error ? err.message : String(err)}`;
        failed++;
      }
    }));

    if (dbUpdates.length > 0) {
      try {
        await batchUpdateCandidateImageUrls(dbUpdates);
        for (const { id } of dbUpdates) {
          details[idToCrmId[id]] = 'OK';
          uploaded++;
        }
      } catch (err) {
        const msg = `DB: ${err instanceof Error ? err.message : String(err)}`;
        for (const { id } of dbUpdates) {
          details[idToCrmId[id]] = msg;
          failed++;
        }
      }
    }
  }

  return { uploaded, failed, skipped, details };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const body = await req.json() as {
      action?: string;
      user?: string;
      pass?: string;
      crm_ids?: string[];
      candidate_ids?: string[];
      round_id?: string;
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

      const session = await crmLogin(loginUser, loginPass);
      const candidates = crm_ids.map((crm_id, i) => ({ crm_id, id: candidate_ids[i] }));
      const result = await processPhotosInChunks(candidates, round_id, session);
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
