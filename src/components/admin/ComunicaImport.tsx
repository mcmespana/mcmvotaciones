import { errorLog } from '@/lib/logger';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { fetchAllCRMContacts, fetchCRMPhotos, groupByLocation, CRMContact, CRMContactGroup } from '@/lib/sinergiaCRM';

interface Round {
  id: string;
  title: string;
  year: number;
  team: string;
  candidate_count: number;
}

type WizardStep = 'select-round' | 'confirm-fetch' | 'review' | 'importing' | 'photos' | 'done';

const SESSIONKEY_USER = 'crm_user';
const SESSIONKEY_PASS = 'crm_pass';
const DEFAULT_RELATIONSHIP_TYPES = ['grupo', 'monitor'];

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-[22px] h-[22px] rounded-full bg-[var(--avd-brand)] text-white text-[11px] font-extrabold grid place-items-center shrink-0">{n}</span>
  );
}

export function ComunicaImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<WizardStep>('select-round');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [crmUser, setCrmUser] = useState(() => sessionStorage.getItem(SESSIONKEY_USER) ?? '');
  const [crmPass, setCrmPass] = useState(() => sessionStorage.getItem(SESSIONKEY_PASS) ?? '');
  const [selectedRelTypes, setSelectedRelTypes] = useState<string[]>(DEFAULT_RELATIONSHIP_TYPES);
  const [newRelType, setNewRelType] = useState('');
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [groups, setGroups] = useState<CRMContactGroup[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [existingCrmIds, setExistingCrmIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [photoResult, setPhotoResult] = useState<{ uploaded: number; failed: number } | null>(null);
  const [importedCandidates, setImportedCandidates] = useState<Array<{ crm_id: string; candidate_id: string }>>([]);

  useEffect(() => {
    async function loadRounds() {
      setRoundsLoading(true);
      const { data } = await supabase.from('rounds').select('id, title, year, team').order('created_at', { ascending: false });
      if (!data) { setRoundsLoading(false); return; }
      const ids = data.map(r => r.id);
      const { data: counts } = await supabase.from('candidates').select('round_id').in('round_id', ids);
      const countMap: Record<string, number> = {};
      (counts ?? []).forEach(c => { countMap[c.round_id] = (countMap[c.round_id] ?? 0) + 1; });
      const roundsWithCount = data.map(r => ({ ...r, candidate_count: countMap[r.id] ?? 0 }));
      setRounds(roundsWithCount);
      const paramRound = searchParams.get('round');
      if (paramRound && roundsWithCount.some(r => r.id === paramRound)) setSelectedRoundId(paramRound);
      setRoundsLoading(false);
    }
    loadRounds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleRelType(type: string) {
    setSelectedRelTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  }

  function addRelType() {
    const val = newRelType.trim().toLowerCase();
    if (val && !selectedRelTypes.includes(val)) setSelectedRelTypes(prev => [...prev, val]);
    setNewRelType('');
  }

  async function handleFetchContacts() {
    if (crmUser) sessionStorage.setItem(SESSIONKEY_USER, crmUser);
    else sessionStorage.removeItem(SESSIONKEY_USER);
    if (crmPass) sessionStorage.setItem(SESSIONKEY_PASS, crmPass);
    else sessionStorage.removeItem(SESSIONKEY_PASS);
    setFetchLoading(true);
    try {
      const credentials = crmUser && crmPass ? { user: crmUser, pass: crmPass } : undefined;
      const data = await fetchAllCRMContacts(credentials);
      // Matching the rel-type filter + those with NO rel type at all (shown unchecked)
      const allToShow = selectedRelTypes.length > 0
        ? data.filter(c => c.relationship_types.some(rt => selectedRelTypes.includes(rt)) || c.relationship_types.length === 0)
        : data;
      setContacts(allToShow);
      const grouped = groupByLocation(allToShow);
      setGroups(grouped);
      setOpenGroups(new Set(grouped.map(g => g.location)));
      // Pre-select only those matching the filter (not Asesora, not no-rel-type)
      const preSelected = allToShow.filter(c =>
        c.etapa?.toLowerCase() !== 'asesora' &&
        (selectedRelTypes.length === 0 || c.relationship_types.some(rt => selectedRelTypes.includes(rt))),
      );
      setSelected(new Set(preSelected.map(c => c.crm_id)));
      const { data: existing } = await supabase.from('candidates').select('crm_id').eq('round_id', selectedRoundId).not('crm_id', 'is', null);
      setExistingCrmIds(new Set((existing ?? []).map(e => e.crm_id as string)));
      setStep('review');
    } catch (err) {
      errorLog(err);
    } finally {
      setFetchLoading(false);
    }
  }

  const filteredGroups = useMemo<CRMContactGroup[]>(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.map(g => ({
      ...g,
      contacts: g.contacts.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.dni ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q),
      ),
    })).filter(g => g.contacts.length > 0);
  }, [groups, search]);

  const totalFiltered = useMemo(() => filteredGroups.reduce((acc, g) => acc + g.contacts.length, 0), [filteredGroups]);
  const selectedCount = useMemo(() => [...selected].filter(id => contacts.some(c => c.crm_id === id)).length, [selected, contacts]);
  const noRelTypeCount = useMemo(
    () => selectedRelTypes.length > 0 ? contacts.filter(c => c.relationship_types.length === 0).length : 0,
    [contacts, selectedRelTypes],
  );

  function toggleContact(crmId: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(crmId)) next.delete(crmId); else next.add(crmId); return next; });
  }

  function selectAll() {
    const visible = filteredGroups.flatMap(g => g.contacts.map(c => c.crm_id));
    setSelected(prev => { const next = new Set(prev); visible.forEach(id => next.add(id)); return next; });
  }

  function selectNone() {
    const visible = new Set(filteredGroups.flatMap(g => g.contacts.map(c => c.crm_id)));
    setSelected(prev => { const next = new Set(prev); visible.forEach(id => next.delete(id)); return next; });
  }

  function toggleGroup(location: string) {
    setOpenGroups(prev => { const next = new Set(prev); if (next.has(location)) next.delete(location); else next.add(location); return next; });
  }

  async function handleImport() {
    setConfirmOpen(false);
    setStep('importing');
    const toImport = contacts.filter(c => selected.has(c.crm_id));
    const rows = toImport.map((c, idx) => ({
      round_id: selectedRoundId,
      name: c.first_name,
      surname: c.last_name,
      location: c.location,
      age: c.age,
      birthdate: c.birthdate || null,
      crm_id: c.crm_id,
      dni: c.dni,
      etapa: c.etapa,
      asamblea_movimiento_es: c.asamblea_movimiento_es,
      asamblea_responsabilidad: c.asamblea_responsabilidad,
      monitor_desde: c.monitor_desde,
      monitor_de: c.monitor_de,
      grupo_mcm: c.grupo,
      crm_relationship_types: c.relationship_types.length > 0 ? c.relationship_types.join(',') : null,
      crm_source: 'sinergiacrm',
      order_index: idx,
    }));
    const { data: existing } = await supabase.from('candidates').select('crm_id').eq('round_id', selectedRoundId).not('crm_id', 'is', null);
    const alreadyExists = new Set((existing ?? []).map(e => e.crm_id as string));
    const newRows = rows.filter(r => !alreadyExists.has(r.crm_id));
    const skipped = rows.length - newRows.length;
    const BATCH = 100;
    let inserted = 0;
    const insertedRows: Array<{ id: string; crm_id: string }> = [];
    for (let i = 0; i < newRows.length; i += BATCH) {
      const batch = newRows.slice(i, i + BATCH);
      const { data, error } = await supabase.from('candidates').insert(batch).select('id, crm_id');
      if (error) { setStep('review'); return; }
      inserted += (data ?? []).length;
      insertedRows.push(...(data ?? []) as Array<{ id: string; crm_id: string }>);
    }
    setImportResult({ inserted, skipped });

    // Arrancar fotos automáticamente si hay candidatos con crm_id
    const withCrmId = insertedRows.filter(r => r.crm_id);
    if (withCrmId.length > 0) {
      setImportedCandidates(withCrmId.map(r => ({ crm_id: r.crm_id, candidate_id: r.id })));
      setStep('photos');
      try {
        const credentials = crmUser && crmPass ? { user: crmUser, pass: crmPass } : undefined;
        const result = await fetchCRMPhotos(
          withCrmId.map(r => ({ crm_id: r.crm_id, candidate_id: r.id })),
          selectedRoundId,
          credentials,
        );
        setPhotoResult(result);
      } catch (err) {
        errorLog('fetchCRMPhotos error:', err);
        setPhotoResult({ uploaded: 0, failed: withCrmId.length });
      }
    }

    setStep('done');
  }

  function resetWizard() {
    setStep('select-round');
    setSelectedRoundId('');
    setContacts([]);
    setGroups([]);
    setSelected(new Set());
    setSearch('');
    setImportResult(null);
    setPhotoResult(null);
    setImportedCandidates([]);
    setExistingCrmIds(new Set());
    setRoundsLoading(true);
    supabase.from('rounds').select('id, title, year, team').order('created_at', { ascending: false }).then(({ data }) => {
      if (!data) { setRoundsLoading(false); return; }
      supabase.from('candidates').select('round_id').in('round_id', data.map(r => r.id)).then(({ data: counts }) => {
        const countMap: Record<string, number> = {};
        (counts ?? []).forEach(c => { countMap[c.round_id] = (countMap[c.round_id] ?? 0) + 1; });
        setRounds(data.map(r => ({ ...r, candidate_count: countMap[r.id] ?? 0 })));
        setRoundsLoading(false);
      });
    });
  }

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  const cardClass = 'bg-avd-surface border border-avd-border rounded-avd-md overflow-hidden';
  const sectionHeadClass = 'px-4 py-3 border-b border-avd-border-soft bg-[var(--avd-bg-elev)] flex items-center gap-[10px]';

  return (
    <div className="adm-page">
      {/* Topbar */}
      <header className="adm-topbar">
        <div className="adm-brand">
          <div className="avd-brand-mark">C</div>
          <span className="font-bold text-sm text-avd-fg">VotacionesMCM</span>
        </div>
        <div className="flex-1" />
        <button className="avd-btn avd-btn-sm" onClick={() => navigate(selectedRoundId ? `/admin/votaciones/${selectedRoundId}` : '/admin/dashboard?tab=votaciones')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Volver
        </button>
      </header>

      {/* Page header */}
      <div className="px-6 pt-[18px] pb-[14px] border-b border-avd-border bg-[var(--avd-bg-elev)]">
        <div className="flex items-center gap-3 max-w-[860px] mx-auto">
          <div className="w-10 h-10 rounded-full bg-avd-brand-bg border border-[var(--avd-brand-border)] grid place-items-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div>
            <div className="text-[17px] font-extrabold tracking-tight text-avd-fg">Importar desde SinergiaCRM</div>
            <div className="text-[13px] text-avd-fg-muted mt-0.5">Importa personas del CRM directamente a una votación existente</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="adm-scroll p-5 px-6">
        <div className="max-w-[860px] mx-auto flex flex-col gap-4">

          {/* ── PASO 1: Seleccionar votación ── */}
          {step === 'select-round' && (
            <div className={cardClass}>
              <div className={sectionHeadClass}>
                <StepBadge n={1} />
                <div>
                  <div className="font-bold text-[13px] text-avd-fg">Configurar consulta</div>
                  <div className="text-xs text-avd-fg-muted">Elige la votación de destino y configura la conexión con SinergiaCRM.</div>
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                {roundsLoading ? (
                  <div className="flex items-center gap-2 text-[13px] text-avd-fg-muted py-3">
                    <div className="w-4 h-4 border-2 border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full shrink-0 [animation:spin_0.7s_linear_infinite]" />
                    Cargando votaciones...
                  </div>
                ) : rounds.length === 0 ? (
                  <div className="avd-empty">
                    <p className="avd-empty-title">Sin votaciones</p>
                    <p className="avd-empty-sub">Crea una votación desde el panel primero.</p>
                  </div>
                ) : (
                  <>
                    {/* Selector de votación */}
                    <div className="avd-form-field">
                      <label className="avd-label">Votación de destino</label>
                      <select className="avd-select" value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)}>
                        <option value="">Elige una votación...</option>
                        {rounds.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title} — {r.year} · {r.team}{r.candidate_count > 0 ? ` (${r.candidate_count} candidatos)` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedRound && (
                        <div className="mt-2 p-[10px_12px] bg-avd-bg-sunken border border-avd-border-soft rounded-avd-sm text-[12.5px]">
                          <div className="text-avd-fg mb-0.5"><strong>Votación:</strong> {selectedRound.title}</div>
                          <div className="text-avd-fg-muted"><strong>Año / Equipo:</strong> {selectedRound.year} · {selectedRound.team} &nbsp;·&nbsp; <strong>Candidatos:</strong> {selectedRound.candidate_count}</div>
                        </div>
                      )}
                    </div>

                    {/* Credenciales CRM */}
                    <div className="avd-section-card">
                      <div className="avd-section-card-header">
                        <div className="avd-section-accent" />
                        <div>
                          <div className="font-bold text-[12.5px] text-avd-fg">Acceso a SinergiaCRM</div>
                          <div className="text-[11.5px] text-avd-fg-muted mt-[1px]">
                            Usuario y contraseña con acceso a{' '}
                            <span className="font-avd-mono text-[11px]">tu CRM configurado</span>
                          </div>
                        </div>
                      </div>
                      <div className="avd-form-grid avd-form-grid-2 p-[12px_14px]">
                        <div className="avd-form-field">
                          <label className="avd-label">Usuario</label>
                          <input className="avd-input" placeholder="usuario@mcm..." value={crmUser} onChange={e => setCrmUser(e.target.value)} autoComplete="username" />
                        </div>
                        <div className="avd-form-field">
                          <label className="avd-label">Contraseña</label>
                          <input className="avd-input" type="password" placeholder="••••••••" value={crmPass} onChange={e => setCrmPass(e.target.value)} autoComplete="current-password" />
                        </div>
                      </div>
                    </div>

                    {/* Filtro tipos de relación */}
                    <div className="avd-section-card">
                      <div className="avd-section-card-header">
                        <div className="avd-section-accent" />
                        <div>
                          <div className="font-bold text-[12.5px] text-avd-fg">Filtrar por tipo de relación</div>
                          <div className="text-[11.5px] text-avd-fg-muted mt-[1px]">Solo se importarán personas con al menos una de las relaciones marcadas.</div>
                        </div>
                      </div>
                      <div className="avd-section-card-body flex flex-col gap-3">
                        <div className="flex flex-wrap gap-[10px]">
                          {Array.from(new Set([...DEFAULT_RELATIONSHIP_TYPES, ...selectedRelTypes])).map(type => (
                            <label key={type} className="flex items-center gap-[7px] cursor-pointer select-none text-[13px]">
                              <input
                                type="checkbox"
                                checked={selectedRelTypes.includes(type)}
                                onChange={() => toggleRelType(type)}
                                className="w-[14px] h-[14px] accent-[var(--avd-brand)] cursor-pointer"
                              />
                              <span className="text-avd-fg capitalize">{type}</span>
                              {!DEFAULT_RELATIONSHIP_TYPES.includes(type) && (
                                <button
                                  type="button"
                                  onClick={e => { e.preventDefault(); setSelectedRelTypes(prev => prev.filter(t => t !== type)); }}
                                  className="bg-transparent border-0 cursor-pointer p-0 text-avd-fg-faint flex"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                                </button>
                              )}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-[6px]">
                          <input
                            className="avd-input h-[30px] text-xs"
                            placeholder="Añadir otro tipo..."
                            value={newRelType}
                            onChange={e => setNewRelType(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRelType(); } }}
                          />
                          <button className="avd-btn avd-btn-sm" onClick={addRelType} disabled={!newRelType.trim()}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                            Añadir
                          </button>
                        </div>
                        {selectedRelTypes.length === 0 && (
                          <div className="avd-warn-notice text-xs !justify-start">
                            Sin filtro activo se traerán todos los contactos del CRM.
                          </div>
                        )}
                      </div>
                    </div>

                    <button className="avd-btn avd-btn-primary avd-btn-block h-10 text-sm font-bold justify-center" disabled={!selectedRoundId} onClick={() => setStep('confirm-fetch')}>
                      Continuar
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 2: Confirmar consulta ── */}
          {step === 'confirm-fetch' && (
            <div className={cardClass}>
              <div className={sectionHeadClass}>
                <StepBadge n={2} />
                <div>
                  <div className="font-bold text-[13px] text-avd-fg">Consultar SinergiaCRM</div>
                  <div className="text-xs text-avd-fg-muted">
                    Se descargarán contactos con relación{' '}
                    {selectedRelTypes.length > 0 ? <strong>{selectedRelTypes.join(', ')}</strong> : <strong>cualquiera</strong>}.
                    {' '}Puede tardar unos segundos.
                  </div>
                </div>
              </div>
              <div className="p-5">
                {fetchLoading ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-8 h-8 border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full [animation:spin_0.7s_linear_infinite]" />
                    <div>
                      <div className="font-semibold text-sm text-avd-fg">Conectando con SinergiaCRM...</div>
                      <div className="text-xs text-avd-fg-muted mt-1">Esto puede tardar 15–30 s si hay muchos registros.</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button className="avd-btn gap-[6px]" onClick={() => setStep('select-round')}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                      Volver
                    </button>
                    <button className="avd-btn avd-btn-primary flex-1 justify-center h-10" onClick={handleFetchContacts}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      Traer personas de SinergiaCRM
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 3: Revisar y seleccionar ── */}
          {step === 'review' && (
            <>
              <div className={cardClass}>
                <div className={sectionHeadClass}>
                  <StepBadge n={3} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] text-avd-fg">Selecciona los candidatos a importar</div>
                    <div className="text-xs text-avd-fg-muted">
                      {contacts.length} personas · relación <strong>{selectedRelTypes.join(', ') || 'cualquiera'}</strong>
                      {noRelTypeCount > 0 && <> · <span className="text-avd-warn-fg">{noRelTypeCount} sin relación activa (sin marcar)</span></>}
                      {existingCrmIds.size > 0 && <> · <span className="text-avd-warn-fg">{existingCrmIds.size} ya en esta votación</span></>}
                    </div>
                  </div>
                </div>
                <div className="p-3 px-4 flex flex-col gap-[10px]">
                  {/* Search + actions bar */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="avd-search-wrap flex-1 min-w-[200px] relative">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-[9px] top-1/2 -translate-y-1/2 text-avd-fg-faint pointer-events-none"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                      <input className="avd-input pl-[30px]" placeholder="Buscar por nombre, DNI o delegación..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="avd-btn avd-btn-sm" onClick={selectAll}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Todos
                    </button>
                    <button className="avd-btn avd-btn-sm" onClick={selectNone}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      Ninguno
                    </button>
                    <span className="text-[12.5px] text-avd-fg-muted ml-auto">
                      <strong className="text-avd-fg">{selectedCount}</strong> de <strong className="text-avd-fg">{contacts.length}</strong> seleccionados
                      {search && ` · mostrando ${totalFiltered}`}
                    </span>
                  </div>

                  {/* Groups */}
                  {filteredGroups.length === 0 ? (
                    <div className="avd-empty">
                      <p className="avd-empty-title">Sin resultados para «{search}»</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[6px]">
                      {filteredGroups.map(group => {
                        const groupSelected = group.contacts.filter(c => selected.has(c.crm_id)).length;
                        const isOpen = openGroups.has(group.location);
                        return (
                          <div key={group.location} className="border border-avd-border rounded-avd-sm overflow-hidden">
                            <button
                              onClick={() => toggleGroup(group.location)}
                              className={`w-full flex items-center gap-[10px] px-3 py-[9px] bg-[var(--avd-bg-elev)] border-none cursor-pointer text-left ${isOpen ? 'border-b border-[var(--avd-border-soft)]' : ''}`}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-avd-fg-muted flex-shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              <span className="font-semibold text-[13px] text-avd-fg flex-1">{group.location}</span>
                              <span className="avd-chip text-[11px]">{groupSelected}/{group.contacts.length}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-avd-fg-muted transition-transform duration-150${isOpen ? ' rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                            {isOpen && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-[12.5px] border-collapse">
                                  <thead>
                                    <tr className="border-b border-avd-border-soft">
                                      <th className="w-8 px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left" />
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Nombre</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Apellidos</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-center">Edad</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">DNI</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Etapa</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Grupo</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Relación</th>
                                      <th className="px-[10px] py-[6px] font-semibold text-avd-fg-muted text-left">Monitor de</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.contacts.map((c, idx) => {
                                      const alreadyIn = existingCrmIds.has(c.crm_id);
                                      const isSelected = selected.has(c.crm_id);
                                      const isNoRelType = selectedRelTypes.length > 0 && c.relationship_types.length === 0;
                                      return (
                                        <tr
                                          key={c.crm_id}
                                          onClick={() => toggleContact(c.crm_id)}
                                          className={`cursor-pointer border-b border-avd-border-soft ${alreadyIn ? 'opacity-60' : 'opacity-100'} ${isSelected ? 'bg-[color-mix(in_oklch,var(--avd-brand)_6%,transparent)]' : isNoRelType ? 'bg-[color-mix(in_oklch,var(--avd-warn)_10%,transparent)]' : idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--avd-bg-sunken)]'}`}
                                        >
                                          <td className="px-[10px] py-[7px]">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleContact(c.crm_id)}
                                              onClick={e => e.stopPropagation()}
                                              className="w-[13px] h-[13px] accent-[var(--avd-brand)] cursor-pointer"
                                            />
                                          </td>
                                          <td className="px-[10px] py-[7px] text-avd-fg whitespace-nowrap">
                                            {c.first_name}
                                            {alreadyIn && <span className="avd-chip avd-chip-warn ml-[5px] text-[10px] h-4">ya importada</span>}
                                          </td>
                                          <td className="px-[10px] py-[7px] text-avd-fg">{c.last_name}</td>
                                          <td className="px-[10px] py-[7px] text-avd-fg-muted text-center">{c.age ?? '—'}</td>
                                          <td className="px-[10px] py-[7px] text-avd-fg-muted font-avd-mono text-[11.5px]">{c.dni ?? '—'}</td>
                                          <td className="px-[10px] py-[7px] text-avd-fg-muted">{c.etapa ?? '—'}</td>
                                          <td className="px-[10px] py-[7px] text-avd-fg-muted">{c.grupo ?? '—'}</td>
                                          <td className="px-[10px] py-[7px]">
                                            {c.relationship_types.length > 0
                                              ? c.relationship_types.map(rt => (
                                                <span key={rt} className="avd-chip mr-[3px] text-[10.5px] capitalize">{rt}</span>
                                              ))
                                              : isNoRelType
                                              ? <span className="avd-chip avd-chip-warn text-[10.5px]">sin relación</span>
                                              : <span className="text-avd-fg-faint">—</span>
                                            }
                                          </td>
                                          <td className="px-[10px] py-[7px] text-avd-fg-muted">{c.monitor_de ?? '—'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-2">
                <button className="avd-btn gap-[6px]" onClick={() => setStep('confirm-fetch')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                  Volver
                </button>
                <button
                  className="avd-btn avd-btn-primary flex-1 justify-center h-10 font-bold"
                  disabled={selectedCount === 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Importar {selectedCount} candidato{selectedCount !== 1 ? 's' : ''} a «{selectedRound?.title}»
                </button>
              </div>
            </>
          )}

          {/* ── PASO 4: Importando ── */}
          {step === 'importing' && (
            <div className={cardClass}>
              <div className="flex flex-col items-center gap-[14px] px-6 py-12 text-center">
                <div className="w-10 h-10 border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full [animation:spin_0.7s_linear_infinite]" />
                <div className="text-[16px] font-bold text-avd-fg">Importando candidatos…</div>
                <div className="text-[13px] text-avd-fg-muted">Por favor espera.</div>
              </div>
            </div>
          )}

          {/* ── PASO 4b: Importando fotos ── */}
          {step === 'photos' && (
            <div className={cardClass}>
              <div className="flex flex-col items-center gap-[14px] px-6 py-12 text-center">
                <div className="w-10 h-10 border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full [animation:spin_0.7s_linear_infinite]" />
                <div className="text-[16px] font-bold text-avd-fg">Importando fotos desde CRM…</div>
                <div className="text-[13px] text-avd-fg-muted">
                  Descargando {importedCandidates.length} fotos. Puede tardar unos segundos.
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 5: Hecho ── */}
          {step === 'done' && importResult && (
            <div className={cardClass}>
              <div className={sectionHeadClass}>
                <div className="w-[22px] h-[22px] rounded-full bg-[var(--avd-ok)] grid place-items-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="font-bold text-[13px] text-avd-fg">Importación completada</div>
                  <div className="text-xs text-avd-fg-muted">Candidatos añadidos a «{selectedRound?.title}».</div>
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                <div className={`grid gap-[10px] ${importResult.skipped > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="bg-[var(--avd-ok-bg)] border border-[color-mix(in_oklch,var(--avd-ok)_30%,transparent)] rounded-avd-sm p-[16px_20px] text-center">
                    <div className="text-[32px] font-extrabold text-[var(--avd-ok)] tracking-[-0.03em]">{importResult.inserted}</div>
                    <div className="text-[12.5px] text-avd-fg-muted mt-1">Candidatos añadidos</div>
                  </div>
                  {importResult.skipped > 0 && (
                    <div className="bg-avd-bg-sunken border border-avd-border rounded-avd-sm p-[16px_20px] text-center">
                      <div className="text-[32px] font-extrabold text-avd-fg-muted tracking-[-0.03em]">{importResult.skipped}</div>
                      <div className="text-[12.5px] text-avd-fg-muted mt-1">Ya existían (omitidos)</div>
                    </div>
                  )}
                </div>

                {photoResult !== null && (
                  <div className="bg-avd-bg-sunken border border-avd-border rounded-avd-sm p-[12px_16px] flex items-center gap-[10px]">
                    <span className="text-[18px]">📷</span>
                    <div className="text-[13px] text-avd-fg">
                      <strong>{photoResult.uploaded}</strong> foto{photoResult.uploaded !== 1 ? 's' : ''} importada{photoResult.uploaded !== 1 ? 's' : ''}
                      {photoResult.failed > 0 && <span className="text-avd-fg-muted"> · {photoResult.failed} sin foto en CRM</span>}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="avd-btn flex-1 justify-center" onClick={resetWizard}>
                    Importar a otra votación
                  </button>
                  <button className="avd-btn avd-btn-primary flex-1 justify-center" onClick={() => navigate(selectedRoundId ? `/admin/votaciones/${selectedRoundId}` : '/admin/dashboard?tab=votaciones')}>
                    Volver a la votación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}>
          <div className="avd-dialog max-w-[440px]" onClick={e => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Confirmar importación?</h2>
              <p>
                Se importarán <strong>{selectedCount} candidatos</strong> a la votación <strong>«{selectedRound?.title}»</strong>.
                {existingCrmIds.size > 0 && ' Los que ya existan serán ignorados automáticamente.'}
              </p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-primary" onClick={handleImport}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
