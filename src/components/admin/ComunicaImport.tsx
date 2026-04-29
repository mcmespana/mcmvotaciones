import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { fetchAllCRMContacts, groupByLocation, CRMContact, CRMContactGroup } from '@/lib/sinergiaCRM';

interface Round {
  id: string;
  title: string;
  year: number;
  team: string;
  candidate_count: number;
}

type WizardStep = 'select-round' | 'confirm-fetch' | 'review' | 'importing' | 'done';

const SESSIONKEY_USER = 'crm_user';
const SESSIONKEY_PASS = 'crm_pass';
const DEFAULT_RELATIONSHIP_TYPES = ['grupo', 'monitor'];

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      background: 'var(--avd-brand)', color: '#fff',
      fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{n}</span>
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
      const filtered = selectedRelTypes.length > 0
        ? data.filter(c => c.relationship_types.some(rt => selectedRelTypes.includes(rt)))
        : data;
      setContacts(filtered);
      const grouped = groupByLocation(filtered);
      setGroups(grouped);
      setOpenGroups(new Set(grouped.map(g => g.location)));
      setSelected(new Set(filtered.filter(c => c.etapa?.toLowerCase() !== 'asesora').map(c => c.crm_id)));
      const { data: existing } = await supabase.from('candidates').select('crm_id').eq('round_id', selectedRoundId).not('crm_id', 'is', null);
      setExistingCrmIds(new Set((existing ?? []).map(e => e.crm_id as string)));
      setStep('review');
    } catch (err) {
      console.error(err);
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
    for (let i = 0; i < newRows.length; i += BATCH) {
      const batch = newRows.slice(i, i + BATCH);
      const { data, error } = await supabase.from('candidates').insert(batch).select('id');
      if (error) { setStep('review'); return; }
      inserted += (data ?? []).length;
    }
    setImportResult({ inserted, skipped });
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

  const cardStyle: React.CSSProperties = {
    background: 'var(--avd-surface)',
    border: '1px solid var(--avd-border)',
    borderRadius: 'var(--avd-radius-md)',
    overflow: 'hidden',
  };

  const sectionHeadStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--avd-border-soft)',
    background: 'var(--avd-bg-elev)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  return (
    <div className="adm-page">
      {/* Topbar */}
      <header className="adm-topbar">
        <div className="adm-brand">
          <div className="avd-brand-mark">C</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--avd-fg)' }}>VotacionesMCM</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="avd-btn avd-btn-sm" onClick={() => navigate(selectedRoundId ? `/admin/votaciones/${selectedRoundId}` : '/admin/dashboard?tab=votaciones')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Volver
        </button>
      </header>

      {/* Page header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--avd-border)', background: 'var(--avd-bg-elev)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 860, margin: '0 auto' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--avd-brand-bg)', border: '1px solid var(--avd-brand-border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--avd-fg)' }}>Importar desde SinergiaCRM</div>
            <div style={{ fontSize: 13, color: 'var(--avd-fg-muted)', marginTop: 2 }}>Importa personas del CRM directamente a una votación existente</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="adm-scroll" style={{ padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── PASO 1: Seleccionar votación ── */}
          {step === 'select-round' && (
            <div style={cardStyle}>
              <div style={sectionHeadStyle}>
                <StepBadge n={1} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--avd-fg)' }}>Configurar consulta</div>
                  <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)' }}>Elige la votación de destino y configura la conexión con SinergiaCRM.</div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {roundsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--avd-fg-muted)', padding: '12px 0' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
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
                        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--avd-bg-sunken)', border: '1px solid var(--avd-border-soft)', borderRadius: 'var(--avd-radius-sm)', fontSize: 12.5 }}>
                          <div style={{ color: 'var(--avd-fg)', marginBottom: 2 }}><strong>Votación:</strong> {selectedRound.title}</div>
                          <div style={{ color: 'var(--avd-fg-muted)' }}><strong>Año / Equipo:</strong> {selectedRound.year} · {selectedRound.team} &nbsp;·&nbsp; <strong>Candidatos:</strong> {selectedRound.candidate_count}</div>
                        </div>
                      )}
                    </div>

                    {/* Credenciales CRM */}
                    <div style={{ border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-sm)', background: 'var(--avd-bg-sunken)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--avd-border-soft)', display: 'flex', gap: 8 }}>
                        <div style={{ width: 3, borderRadius: 2, background: 'var(--avd-brand)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--avd-fg)' }}>Acceso a SinergiaCRM</div>
                          <div style={{ fontSize: 11.5, color: 'var(--avd-fg-muted)', marginTop: 1 }}>
                            Usuario y contraseña con acceso a{' '}
                            <span style={{ fontFamily: 'var(--avd-font-mono)', fontSize: 11 }}>tu CRM configurado</span>
                          </div>
                        </div>
                      </div>
                      <div className="avd-form-grid avd-form-grid-2" style={{ padding: '12px 14px' }}>
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
                    <div style={{ border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-sm)', background: 'var(--avd-bg-sunken)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--avd-border-soft)', display: 'flex', gap: 8 }}>
                        <div style={{ width: 3, borderRadius: 2, background: 'var(--avd-brand)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--avd-fg)' }}>Filtrar por tipo de relación</div>
                          <div style={{ fontSize: 11.5, color: 'var(--avd-fg-muted)', marginTop: 1 }}>Solo se importarán personas con al menos una de las relaciones marcadas.</div>
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {Array.from(new Set([...DEFAULT_RELATIONSHIP_TYPES, ...selectedRelTypes])).map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={selectedRelTypes.includes(type)}
                                onChange={() => toggleRelType(type)}
                                style={{ width: 14, height: 14, accentColor: 'var(--avd-brand)', cursor: 'pointer' }}
                              />
                              <span style={{ color: 'var(--avd-fg)', textTransform: 'capitalize' }}>{type}</span>
                              {!DEFAULT_RELATIONSHIP_TYPES.includes(type) && (
                                <button
                                  type="button"
                                  onClick={e => { e.preventDefault(); setSelectedRelTypes(prev => prev.filter(t => t !== type)); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--avd-fg-faint)', display: 'flex' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                                </button>
                              )}
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="avd-input"
                            placeholder="Añadir otro tipo..."
                            value={newRelType}
                            onChange={e => setNewRelType(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRelType(); } }}
                            style={{ height: 30, fontSize: 12 }}
                          />
                          <button className="avd-btn avd-btn-sm" onClick={addRelType} disabled={!newRelType.trim()}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                            Añadir
                          </button>
                        </div>
                        {selectedRelTypes.length === 0 && (
                          <div style={{ fontSize: 12, color: 'var(--avd-warn-fg)', padding: '6px 10px', background: 'var(--avd-warn-bg)', borderRadius: 'var(--avd-radius-sm)', border: '1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)' }}>
                            Sin filtro activo se traerán todos los contactos del CRM.
                          </div>
                        )}
                      </div>
                    </div>

                    <button className="avd-btn avd-btn-primary avd-btn-block" style={{ height: 40, fontSize: 14, fontWeight: 700, justifyContent: 'center' }} disabled={!selectedRoundId} onClick={() => setStep('confirm-fetch')}>
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
            <div style={cardStyle}>
              <div style={sectionHeadStyle}>
                <StepBadge n={2} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--avd-fg)' }}>Consultar SinergiaCRM</div>
                  <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)' }}>
                    Se descargarán contactos con relación{' '}
                    {selectedRelTypes.length > 0 ? <strong>{selectedRelTypes.join(', ')}</strong> : <strong>cualquiera</strong>}.
                    {' '}Puede tardar unos segundos.
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                {fetchLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, border: '2.5px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--avd-fg)' }}>Conectando con SinergiaCRM...</div>
                      <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)', marginTop: 4 }}>Esto puede tardar 15–30 s si hay muchos registros.</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="avd-btn" onClick={() => setStep('select-round')} style={{ gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                      Volver
                    </button>
                    <button className="avd-btn avd-btn-primary" style={{ flex: 1, justifyContent: 'center', height: 40 }} onClick={handleFetchContacts}>
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
              <div style={cardStyle}>
                <div style={sectionHeadStyle}>
                  <StepBadge n={3} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--avd-fg)' }}>Selecciona los candidatos a importar</div>
                    <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)' }}>
                      {contacts.length} personas · relación <strong>{selectedRelTypes.join(', ') || 'cualquiera'}</strong>
                      {existingCrmIds.size > 0 && <> · <span style={{ color: 'var(--avd-warn-fg)' }}>{existingCrmIds.size} ya en esta votación</span></>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Search + actions bar */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="avd-search-wrap" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--avd-fg-faint)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                      <input className="avd-input" style={{ paddingLeft: 30 }} placeholder="Buscar por nombre, DNI o delegación..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="avd-btn avd-btn-sm" onClick={selectAll}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Todos
                    </button>
                    <button className="avd-btn avd-btn-sm" onClick={selectNone}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      Ninguno
                    </button>
                    <span style={{ fontSize: 12.5, color: 'var(--avd-fg-muted)', marginLeft: 'auto' }}>
                      <strong style={{ color: 'var(--avd-fg)' }}>{selectedCount}</strong> de <strong style={{ color: 'var(--avd-fg)' }}>{contacts.length}</strong> seleccionados
                      {search && ` · mostrando ${totalFiltered}`}
                    </span>
                  </div>

                  {/* Groups */}
                  {filteredGroups.length === 0 ? (
                    <div className="avd-empty">
                      <p className="avd-empty-title">Sin resultados para «{search}»</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredGroups.map(group => {
                        const groupSelected = group.contacts.filter(c => selected.has(c.crm_id)).length;
                        const isOpen = openGroups.has(group.location);
                        return (
                          <div key={group.location} style={{ border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-sm)', overflow: 'hidden' }}>
                            <button
                              onClick={() => toggleGroup(group.location)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px', background: 'var(--avd-bg-elev)', border: 'none',
                                cursor: 'pointer', textAlign: 'left', borderBottom: isOpen ? '1px solid var(--avd-border-soft)' : 'none',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--avd-fg-muted)', flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--avd-fg)', flex: 1 }}>{group.location}</span>
                              <span className="avd-chip" style={{ fontSize: 11 }}>{groupSelected}/{group.contacts.length}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--avd-fg-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                            {isOpen && (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--avd-border-soft)' }}>
                                      <th style={{ width: 32, padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }} />
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>Nombre</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>Apellidos</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'center' }}>Edad</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>DNI</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>Etapa</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>Relación</th>
                                      <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--avd-fg-muted)', textAlign: 'left' }}>Monitor de</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.contacts.map((c, idx) => {
                                      const alreadyIn = existingCrmIds.has(c.crm_id);
                                      const isSelected = selected.has(c.crm_id);
                                      return (
                                        <tr
                                          key={c.crm_id}
                                          onClick={() => toggleContact(c.crm_id)}
                                          style={{
                                            cursor: 'pointer',
                                            opacity: alreadyIn ? 0.6 : 1,
                                            background: isSelected ? 'color-mix(in oklch, var(--avd-brand) 6%, transparent)' : (idx % 2 === 0 ? 'transparent' : 'var(--avd-bg-sunken)'),
                                            borderBottom: '1px solid var(--avd-border-soft)',
                                          }}
                                        >
                                          <td style={{ padding: '7px 10px' }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleContact(c.crm_id)}
                                              onClick={e => e.stopPropagation()}
                                              style={{ width: 13, height: 13, accentColor: 'var(--avd-brand)', cursor: 'pointer' }}
                                            />
                                          </td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg)', whiteSpace: 'nowrap' }}>
                                            {c.first_name}
                                            {alreadyIn && <span className="avd-chip avd-chip-warn" style={{ marginLeft: 5, fontSize: 10, height: 16 }}>ya importada</span>}
                                          </td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg)' }}>{c.last_name}</td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg-muted)', textAlign: 'center' }}>{c.age ?? '—'}</td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg-muted)', fontFamily: 'var(--avd-font-mono)', fontSize: 11.5 }}>{c.dni ?? '—'}</td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg-muted)' }}>{c.etapa ?? '—'}</td>
                                          <td style={{ padding: '7px 10px' }}>
                                            {c.relationship_types.length > 0
                                              ? c.relationship_types.map(rt => (
                                                <span key={rt} className="avd-chip" style={{ marginRight: 3, fontSize: 10.5, textTransform: 'capitalize' }}>{rt}</span>
                                              ))
                                              : <span style={{ color: 'var(--avd-fg-faint)' }}>—</span>
                                            }
                                          </td>
                                          <td style={{ padding: '7px 10px', color: 'var(--avd-fg-muted)' }}>{c.monitor_de ?? '—'}</td>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="avd-btn" onClick={() => setStep('confirm-fetch')} style={{ gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                  Volver
                </button>
                <button
                  className="avd-btn avd-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', height: 40, fontWeight: 700 }}
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
            <div style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '2.5px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--avd-fg)' }}>Importando candidatos…</div>
                <div style={{ fontSize: 13, color: 'var(--avd-fg-muted)' }}>Por favor espera.</div>
              </div>
            </div>
          )}

          {/* ── PASO 5: Hecho ── */}
          {step === 'done' && importResult && (
            <div style={cardStyle}>
              <div style={sectionHeadStyle}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--avd-ok)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--avd-fg)' }}>Importación completada</div>
                  <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)' }}>Candidatos añadidos a «{selectedRound?.title}».</div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: importResult.skipped > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
                  <div style={{ background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)', borderRadius: 'var(--avd-radius-sm)', padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--avd-ok)', letterSpacing: '-0.03em' }}>{importResult.inserted}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--avd-fg-muted)', marginTop: 4 }}>Candidatos añadidos</div>
                  </div>
                  {importResult.skipped > 0 && (
                    <div style={{ background: 'var(--avd-bg-sunken)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-sm)', padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--avd-fg-muted)', letterSpacing: '-0.03em' }}>{importResult.skipped}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--avd-fg-muted)', marginTop: 4 }}>Ya existían (omitidos)</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="avd-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={resetWizard}>
                    Importar a otra votación
                  </button>
                  <button className="avd-btn avd-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(selectedRoundId ? `/admin/votaciones/${selectedRoundId}` : '/admin/dashboard?tab=votaciones')}>
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
        <div className="avd-dialog-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="avd-dialog" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
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
