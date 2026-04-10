import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CRMContact {
  crm_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  dni: string | null;
  birthdate: string | null; // YYYY-MM-DD o formato devuelto por el CRM
  age: number | null;
  location: string | null;  // assigned_user_name → MCM Local
  etapa: string | null;     // ajmcm_etapa_c
  asamblea_movimiento_es: string | null;    // ajmcm_asamblea_movimiento_es_c
  asamblea_responsabilidad: string | null;  // ajmcm_asamblea_responsabilid_c
  monitor_desde: string | null;  // ajmcm_monitor_desde_c
  monitor_de: string | null;     // ajmcm_monitor_de_c
}

// ---------------------------------------------------------------------------
// Normalización de un registro CRM plano
// ---------------------------------------------------------------------------

function normalize(raw: Record<string, string>): CRMContact {
  const n = (s: string | undefined): string | null =>
    s?.trim() ? s.trim() : null;

  const ageRaw = n(raw['stic_age_c']);
  const age = ageRaw ? (Number(ageRaw) || null) : null;

  return {
    crm_id: raw['id'] ?? '',
    first_name: raw['first_name'] ?? '',
    last_name: raw['last_name'] ?? '',
    full_name: `${raw['first_name'] ?? ''} ${raw['last_name'] ?? ''}`.trim(),
    dni: n(raw['stic_identification_number_c']),
    birthdate: n(raw['birthdate']),
    age,
    location: n(raw['assigned_user_name']),
    etapa: n(raw['ajmcm_etapa_c']),
    asamblea_movimiento_es: n(raw['ajmcm_asamblea_movimiento_es_c']),
    asamblea_responsabilidad: n(raw['ajmcm_asamblea_responsabilid_c']),
    monitor_desde: n(raw['ajmcm_monitor_desde_c']),
    monitor_de: n(raw['ajmcm_monitor_de_c']),
  };
}

// ---------------------------------------------------------------------------
// Ordenación: por MCM Local (location) asc, luego por edad asc
// ---------------------------------------------------------------------------

function sortContacts(contacts: CRMContact[]): CRMContact[] {
  return [...contacts].sort((a, b) => {
    const locA = (a.location ?? 'zzz').toLowerCase();
    const locB = (b.location ?? 'zzz').toLowerCase();
    if (locA !== locB) return locA.localeCompare(locB, 'es');
    return (a.age ?? 9999) - (b.age ?? 9999);
  });
}

// ---------------------------------------------------------------------------
// Función principal: consulta el proxy y devuelve los contactos normalizados y ordenados
// ---------------------------------------------------------------------------

export async function fetchAllCRMContacts(): Promise<CRMContact[]> {
  const { data, error } = await supabase.functions.invoke('crm-proxy', {
    body: { action: 'list-contacts' },
  });

  if (error) {
    throw new Error(`Error al conectar con el proxy CRM: ${error.message}`);
  }

  const result = data as { ok: boolean; contacts?: Record<string, string>[]; error?: string; total?: number };

  if (!result?.ok) {
    throw new Error(result?.error ?? 'El proxy CRM devolvió un error desconocido');
  }

  const raw = result.contacts ?? [];
  const normalized = raw.map(normalize).filter(c => c.crm_id); // descartar registros sin id
  return sortContacts(normalized);
}

// ---------------------------------------------------------------------------
// Utilidades de agrupación para el componente de UI
// ---------------------------------------------------------------------------

export interface CRMContactGroup {
  location: string;
  contacts: CRMContact[];
}

export function groupByLocation(contacts: CRMContact[]): CRMContactGroup[] {
  const map = new Map<string, CRMContact[]>();

  for (const c of contacts) {
    const key = c.location ?? 'Sin delegación';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([location, contacts]) => ({ location, contacts }));
}
