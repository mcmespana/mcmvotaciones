// Supabase Edge Function: crm-proxy
// Actúa de proxy entre la SPA y SinergiaCRM para evitar CORS y ocultar credenciales.
// Deno runtime

const CRM_URL = Deno.env.get('SINERGIA_URL') ??
  'https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php';
const CRM_USER = Deno.env.get('SINERGIA_USER') ?? '';
const CRM_PASS = Deno.env.get('SINERGIA_PASS') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// CRM helpers
// ---------------------------------------------------------------------------

async function crmCall(method: string, params: unknown): Promise<Record<string, unknown>> {
  const body = new URLSearchParams();
  body.set('method', method);
  body.set('input_type', 'JSON');
  body.set('response_type', 'JSON');
  body.set('rest_data', JSON.stringify(params));

  const res = await fetch(CRM_URL, { method: 'POST', body });
  if (!res.ok) throw new Error(`CRM ${method} HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function crmLogin(): Promise<string> {
  const res = await crmCall('login', {
    user_auth: {
      user_name: CRM_USER,
      password: CRM_PASS,
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
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json() as { action?: string };
    const { action } = body;

    if (action !== 'list-contacts') {
      return new Response(
        JSON.stringify({ ok: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    if (!CRM_USER || !CRM_PASS) {
      return new Response(
        JSON.stringify({ ok: false, error: 'CRM credentials not configured (SINERGIA_USER / SINERGIA_PASS)' }),
        { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
      );
    }

    const session = await crmLogin();
    const contacts = await fetchAllContacts(session);

    // Logout en background (no bloquea la respuesta)
    crmCall('logout', { session }).catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, contacts, total: contacts.length }),
      { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    );
  }
});
