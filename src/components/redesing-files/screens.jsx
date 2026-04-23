// ─── Screens: Login, VotingList, UserManagement, AdminRouter states ───

const { useState: useS, useEffect: useE, useMemo: useM } = React;

// ══════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [username, setUsername] = useS("");
  const [password, setPassword] = useS("");
  const [showPw, setShowPw] = useS(false);
  const [loading, setLoading] = useS(false);
  const [error, setError] = useS("");

  const submit = (e) => {
    e.preventDefault();
    if (!username || !password) { setError("Completa todos los campos."); return; }
    setError(""); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (username === "admin" && password === "admin") { onLogin?.(); }
      else setError("Credenciales incorrectas. Prueba admin / admin.");
    }, 900);
  };

  return (
    <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)"}}>
      <div style={{width:"100%", maxWidth:400}}>
        {/* Brand mark */}
        <div style={{textAlign:"center", marginBottom:32}}>
          <div style={{width:52, height:52, borderRadius:14, background:"linear-gradient(135deg, var(--brand-400), var(--brand-700))", display:"grid", placeItems:"center", margin:"0 auto 14px", boxShadow:"0 8px 24px -8px color-mix(in oklch, var(--brand-600) 60%, transparent), 0 1px 0 oklch(1 0 0 / 0.18) inset"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={{fontSize:19, fontWeight:800, letterSpacing:"-0.02em", color:"var(--fg)"}}>VotacionesMCM</div>
          <div style={{fontSize:13, color:"var(--fg-muted)", marginTop:4, fontWeight:500}}>Panel de administración · Backstage</div>
        </div>

        {/* Card */}
        <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow-md)"}}>
          {/* Top accent */}
          <div style={{height:3, background:"linear-gradient(90deg, var(--brand-400), var(--brand-600), var(--ok-500))"}} />

          <div style={{padding:"24px 28px 28px"}}>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:16, fontWeight:700, letterSpacing:"-0.01em", color:"var(--fg)", marginBottom:3}}>Iniciar sesión</div>
              <div style={{fontSize:13, color:"var(--fg-muted)"}}>Accede al sistema de gestión de votaciones</div>
            </div>

            <form onSubmit={submit} style={{display:"flex", flexDirection:"column", gap:14}}>
              <div className="form-field">
                <label className="label">Usuario</label>
                <div style={{position:"relative"}}>
                  <svg style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"var(--fg-faint)", pointerEvents:"none"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input className="input" style={{paddingLeft:32}} placeholder="admin" value={username} onChange={e=>setUsername(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="form-field">
                <label className="label">Contraseña</label>
                <div style={{position:"relative"}}>
                  <svg style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"var(--fg-faint)", pointerEvents:"none"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input className="input" style={{paddingLeft:32, paddingRight:38}} type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} />
                  <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--fg-faint)", padding:2, display:"flex"}}>
                    {showPw
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div style={{display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:"var(--radius-sm)", background:"var(--bad-bg)", border:"1px solid color-mix(in oklch, var(--bad) 30%, transparent)", color:"var(--bad-fg)", fontSize:12.5}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{height:42, fontSize:14, fontWeight:700, marginTop:4}} disabled={loading}>
                {loading ? (
                  <span style={{display:"flex", alignItems:"center", gap:8}}>
                    <svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                    Iniciando sesión...
                  </span>
                ) : "Iniciar sesión"}
              </button>
            </form>

            <div style={{marginTop:18, textAlign:"center", fontSize:12, color:"var(--fg-faint)"}}>
              Sistema de votaciones MCM · <span style={{fontFamily:"var(--font-mono)", letterSpacing:"0.05em"}}>v2.0</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ACCESS DENIED / LOADING (AdminRouter states)
// ══════════════════════════════════════════════════════
function LoadingState() {
  return (
    <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)"}}>
      <div style={{textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:16}}>
        <div style={{width:40, height:40, border:"2.5px solid var(--border)", borderTopColor:"var(--brand)", borderRadius:"50%", animation:"spin 0.7s linear infinite"}} />
        <div style={{fontSize:14, color:"var(--fg-muted)", fontWeight:500}}>Verificando credenciales…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AccessDenied({ onBack }) {
  return (
    <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)"}}>
      <div style={{width:"100%", maxWidth:420, textAlign:"center"}}>
        <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow-md)"}}>
          <div style={{height:3, background:"linear-gradient(90deg, var(--bad-500), oklch(0.66 0.22 28))"}} />
          <div style={{padding:"32px 28px 28px", display:"flex", flexDirection:"column", alignItems:"center", gap:18}}>
            <div style={{width:64, height:64, borderRadius:"50%", background:"var(--bad-bg)", border:"1px solid color-mix(in oklch, var(--bad) 25%, transparent)", display:"grid", placeItems:"center"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
            </div>
            <div>
              <div style={{fontSize:20, fontWeight:700, letterSpacing:"-0.015em", color:"var(--fg)", marginBottom:6}}>Acceso Denegado</div>
              <div style={{fontSize:13.5, color:"var(--fg-muted)", lineHeight:1.55, maxWidth:"30ch", margin:"0 auto"}}>No tienes permisos para acceder al panel de administración. Solo los administradores pueden entrar.</div>
            </div>
            <span className="chip chip-bad" style={{height:26, fontSize:12, fontWeight:700}}>Sin permisos de administración</span>
            <button className="btn" onClick={onBack} style={{marginTop:4}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Volver a la página principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// VOTING LIST
// ══════════════════════════════════════════════════════
const MOCK_ROUNDS = [
  { id:"r1", title:"Capítulo Provincial · Elección Consejo Extendido", description:"Elección del nuevo Consejo Provincial Extendido para el trienio 2026–2028.", year:2026, team:"ECE", max_votantes:42, is_active:true, is_closed:false, is_voting_open:true, join_locked:false, current_round_number:2, votes_current_round:28, created_at:"2026-04-10T10:00:00Z" },
  { id:"r2", title:"Capítulo Provincial · Elección Superiora Local", description:"Votación para la renovación del cargo de Superiora Local en la comunidad de Sevilla.", year:2026, team:"ECL", max_votantes:18, is_active:true, is_closed:false, is_voting_open:false, join_locked:false, current_round_number:1, votes_current_round:0, created_at:"2026-04-09T09:00:00Z" },
  { id:"r3", title:"Asamblea General · Renovación Comisión Económica", description:null, year:2025, team:"ECE", max_votantes:55, is_active:false, is_closed:true, is_voting_open:false, join_locked:true, current_round_number:3, votes_current_round:0, created_at:"2025-11-15T08:00:00Z" },
  { id:"r4", title:"Capítulo Regional · Elección Delegadas", description:"Proceso de elección de delegadas para el capítulo provincial de 2026.", year:2025, team:"ECL", max_votantes:30, is_active:false, is_closed:false, is_voting_open:false, join_locked:false, current_round_number:1, votes_current_round:0, created_at:"2025-09-20T14:00:00Z" },
  { id:"r5", title:"Reunión Provincial · Validación de Acuerdos", description:"Ratificación formal de los acuerdos del capítulo ordinario.", year:2025, team:"ECE", max_votantes:22, is_active:false, is_closed:true, is_voting_open:false, join_locked:true, current_round_number:2, votes_current_round:0, created_at:"2025-06-01T11:00:00Z" },
];

function getStatusChip(r) {
  if (r.is_closed) return { cls:"chip-bad", txt:"Cerrada" };
  if (r.is_active && r.is_voting_open) return { cls:"chip-ok", txt:"En curso", pulse:true };
  if (r.is_active && !r.is_voting_open) return { cls:"chip-warn", txt:"Sala abierta" };
  return { cls:"chip-muted", txt:"En espera" };
}

function RoundCard({ round, onOpen, onDelete, isSuperAdmin }) {
  const chip = getStatusChip(round);
  const votePct = round.max_votantes > 0 ? Math.round((round.votes_current_round / round.max_votantes) * 100) : 0;
  const borderAccent = round.is_closed ? "var(--bad-500)" : round.is_voting_open ? "var(--ok-500)" : round.is_active ? "var(--warn-500)" : "var(--border)";

  return (
    <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative", transition:"box-shadow 0.15s, transform 0.15s"}}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow="var(--shadow-md)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
      {/* accent top border */}
      <div style={{height:2.5, background:borderAccent, opacity: round.is_closed || round.is_active ? 1 : 0.35}} />

      <div style={{padding:"14px 16px 12px", flex:1}}>
        {/* Header row */}
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10}}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:"-0.01em", lineHeight:1.3, color:"var(--fg)", marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{round.title}</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, alignItems:"center"}}>
              <span className={`chip ${round.team === "ECE" ? "chip-brand" : ""}`} style={round.team === "ECL" ? {background:"color-mix(in oklch, oklch(0.6 0.2 320) 12%, transparent)", color:"oklch(0.5 0.2 320)", borderColor:"color-mix(in oklch, oklch(0.6 0.2 320) 30%, transparent)"} : {}}>{round.team}</span>
              <span className="chip chip-muted">{round.year}</span>
              <span className={`chip ${chip.cls}`} style={{display:"flex", alignItems:"center", gap:5}}>
                {chip.pulse && <span className="pulse-dot" />}
                {chip.txt}
              </span>
            </div>
          </div>
          {isSuperAdmin && (
            <button className="btn-icon-sm btn-ghost" onClick={()=>onDelete?.(round)} title="Eliminar" style={{color:"var(--fg-faint)", flexShrink:0, border:"none"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          )}
        </div>

        {round.description && (
          <p style={{fontSize:12.5, color:"var(--fg-muted)", marginBottom:12, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", borderLeft:"2px solid var(--border)", paddingLeft:10}}>{round.description}</p>
        )}

        {/* Metrics */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:"auto"}}>
          {[
            {l:"Ronda", v:round.current_round_number, fmt:"n"},
            {l:"Cupo", v:`${round.votes_current_round}/${round.max_votantes}`, fmt:"s"},
            {l:"Entrada", v: !round.is_active && !round.is_closed ? "En espera" : (round.join_locked||round.is_closed) ? "Cerrada" : "Abierta", fmt:"badge",
              cls: !round.is_active && !round.is_closed ? "" : (round.join_locked||round.is_closed) ? "chip-bad" : "chip-ok"},
          ].map(m => (
            <div key={m.l} style={{padding:"8px 10px", borderRadius:"var(--radius-sm)", background:"var(--bg-sunken)", border:"1px solid var(--border-soft)", textAlign:"center"}}>
              <div style={{fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--fg-subtle)", marginBottom:4}}>{m.l}</div>
              {m.fmt === "n" && <div style={{fontSize:18, fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--fg)", lineHeight:1}}>{m.v}</div>}
              {m.fmt === "s" && <div style={{fontSize:14, fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--fg)", lineHeight:1}}>{m.v}</div>}
              {m.fmt === "badge" && <span className={`chip ${m.cls}`} style={{fontSize:11, height:20}}>{m.v}</span>}
            </div>
          ))}
        </div>

        {/* Vote progress (only when active) */}
        {round.is_active && (
          <div style={{marginTop:10}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--fg-muted)", marginBottom:4, fontWeight:500}}>
              <span>Votos ronda {round.current_round_number}</span>
              <span style={{fontWeight:700, fontVariantNumeric:"tabular-nums", color:"var(--fg)"}}>{votePct}%</span>
            </div>
            <div className="meter" style={{height:4}}>
              <div className="meter-fill ok" style={{width:`${votePct}%`}} />
            </div>
          </div>
        )}
      </div>

      <div style={{padding:"10px 16px", borderTop:"1px solid var(--border-soft)", background:"var(--bg-sunken)"}}>
        <button className="btn btn-primary btn-block" style={{height:36, fontSize:13}} onClick={()=>onOpen?.(round)}>
          Gestionar votación
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

function CreateRoundDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useS({ title:"", description:"", year: new Date().getFullYear(), team:"ECE", max_votantes:100, census_mode:"maximum" });
  const upd = k => e => setForm(p=>({...p,[k]:e.target.value}));
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e=>e.stopPropagation()}>
        <div className="dialog-head"><h2>Nueva votación</h2><p>Crea una votación sin salir de la lista.</p></div>
        <div className="dialog-body">
          <div className="form-grid">
            <div className="form-field"><label className="label">Título</label><input className="input" placeholder="Elecciones ECE 2026" value={form.title} onChange={upd("title")} /></div>
            <div className="form-field"><label className="label">Descripción</label><textarea className="textarea" placeholder="Contexto de la votación" rows={2} value={form.description} onChange={upd("description")} /></div>
            <div className="form-grid form-grid-2">
              <div className="form-field"><label className="label">Año</label><input className="input" type="number" value={form.year} onChange={upd("year")} /></div>
              <div className="form-field"><label className="label">Cupo máximo</label><input className="input" type="number" min={1} value={form.max_votantes} onChange={upd("max_votantes")} /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="label">Equipo</label>
                <select className="input" value={form.team} onChange={upd("team")}>
                  <option value="ECE">ECE</option>
                  <option value="ECL">ECL</option>
                </select>
              </div>
              <div className="form-field">
                <label className="label">Modo de censo</label>
                <select className="input" value={form.census_mode} onChange={upd("census_mode")}>
                  <option value="maximum">Máximo</option>
                  <option value="exact">Exacto</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="dialog-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{ onCreate?.(form); onClose(); }}>Crear votación</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ round, onClose, onConfirm }) {
  if (!round) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
        <div className="dialog-head">
          <h2>¿Eliminar votación?</h2>
          <p>Esta acción no se puede deshacer. Se eliminará la votación y todos sus datos asociados.</p>
        </div>
        <div className="dialog-body">
          <div style={{padding:"12px 14px", borderRadius:"var(--radius-sm)", background:"var(--bad-bg)", border:"1px solid color-mix(in oklch, var(--bad) 25%, transparent)", fontSize:13, fontWeight:600, color:"var(--bad-fg)"}}>{round.title}</div>
        </div>
        <div className="dialog-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" style={{background:"var(--bad-bg)", border:"1px solid color-mix(in oklch, var(--bad) 30%, transparent)"}} onClick={()=>{ onConfirm?.(); onClose(); }}>Eliminar votación</button>
        </div>
      </div>
    </div>
  );
}

function AdminVotingList({ onOpenRound, pushToast, isSuperAdmin = true }) {
  const [rounds, setRounds] = useS(MOCK_ROUNDS);
  const [search, setSearch] = useS("");
  const [teamFilter, setTeamFilter] = useS("ALL");
  const [view, setView] = useS("grid");
  const [createOpen, setCreateOpen] = useS(false);
  const [deleteTarget, setDeleteTarget] = useS(null);

  const filtered = useM(() => {
    const q = search.toLowerCase();
    return rounds.filter(r =>
      (!q || r.title.toLowerCase().includes(q) || (r.description||"").toLowerCase().includes(q)) &&
      (teamFilter === "ALL" || r.team === teamFilter)
    );
  }, [rounds, search, teamFilter]);

  const activeCount = rounds.filter(r => r.is_active && !r.is_closed).length;

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column"}}>
      {/* Toolbar */}
      <div style={{padding:"14px 20px", borderBottom:"1px solid var(--border)", background:"var(--bg-elev)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--fg-subtle)"}}>Votaciones</span>
          <span className="chip chip-brand">{activeCount} activas</span>
          <span className="chip chip-muted">{rounds.length} total</span>
        </div>
        <div style={{flex:1}} />
        <div className="search-wrap" style={{width:200}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--fg-faint)", pointerEvents:"none"}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="input" style={{paddingLeft:30}} placeholder="Buscar votación..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          <button className={teamFilter==="ALL"?"active":""} onClick={()=>setTeamFilter("ALL")}>Todos</button>
          <button className={teamFilter==="ECE"?"active":""} onClick={()=>setTeamFilter("ECE")}>ECE</button>
          <button className={teamFilter==="ECL"?"active":""} onClick={()=>setTeamFilter("ECL")}>ECL</button>
        </div>
        <div className="segmented">
          <button className={view==="grid"?"active":""} onClick={()=>setView("grid")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Tarjetas
          </button>
          <button className={view==="list"?"active":""} onClick={()=>setView("list")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lista
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setCreateOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Crear votación
        </button>
      </div>

      {/* Content */}
      <div style={{flex:1, padding:20, overflowY:"auto"}} className="scroll-thin">
        {filtered.length === 0 ? (
          <div className="empty" style={{paddingTop:80}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <p className="empty-title">Sin votaciones</p>
            <p className="empty-sub">Crea una nueva votación para comenzar.</p>
          </div>
        ) : view === "grid" ? (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:14}}>
            {filtered.map(r => <RoundCard key={r.id} round={r} onOpen={onOpenRound} onDelete={setDeleteTarget} isSuperAdmin={isSuperAdmin} />)}
          </div>
        ) : (
          <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden"}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 90px 90px 120px 100px 36px", padding:"8px 14px", background:"var(--bg-sunken)", fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--fg-subtle)", gap:12, alignItems:"center"}}>
              <div>Votación</div><div>Ronda</div><div>Cupo</div><div>Estado</div><div>Equipo</div><div></div>
            </div>
            {filtered.map(r => {
              const chip = getStatusChip(r);
              return (
                <div key={r.id} style={{display:"grid", gridTemplateColumns:"1fr 90px 90px 120px 100px 36px", padding:"11px 14px", borderTop:"1px solid var(--border-soft)", alignItems:"center", gap:12, fontSize:13, transition:"background 0.12s", cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg-hover)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  onClick={()=>onOpenRound?.(r)}>
                  <div>
                    <div style={{fontWeight:600, letterSpacing:"-0.005em"}}>{r.title}</div>
                    {r.description && <div style={{fontSize:11.5, color:"var(--fg-muted)", marginTop:2, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"}}>{r.description}</div>}
                  </div>
                  <div style={{fontWeight:700, fontVariantNumeric:"tabular-nums"}}>{r.current_round_number}</div>
                  <div style={{fontWeight:600, fontVariantNumeric:"tabular-nums"}}>{r.votes_current_round}/{r.max_votantes}</div>
                  <div><span className={`chip ${chip.cls}`} style={{display:"flex", alignItems:"center", gap:5, width:"fit-content"}}>{chip.pulse && <span className="pulse-dot" />}{chip.txt}</span></div>
                  <div><span className={`chip ${r.team==="ECE"?"chip-brand":""}`} style={r.team==="ECL"?{background:"color-mix(in oklch, oklch(0.6 0.2 320) 12%, transparent)", color:"oklch(0.5 0.2 320)", border:"1px solid color-mix(in oklch, oklch(0.6 0.2 320) 30%, transparent)", borderRadius:"999px", padding:"0 8px", height:22, display:"inline-flex", alignItems:"center", fontSize:11.5, fontWeight:600}:{}}>{r.team}</span></div>
                  <div style={{opacity:0}} onClick={e=>{e.stopPropagation(); setDeleteTarget(r);}} onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.parentElement.onMouseEnter(e);}} onMouseLeave={e=>{e.currentTarget.style.opacity=0;}}>
                    <button className="btn-icon-sm btn-ghost" style={{border:"none", color:"var(--fg-faint)"}} onClick={e=>{e.stopPropagation(); setDeleteTarget(r);}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateRoundDialog open={createOpen} onClose={()=>setCreateOpen(false)} onCreate={form=>{
        const code = Array.from({length:4},()=>"ABCDEFGHJK23456789"[Math.floor(Math.random()*18)]).join("");
        setRounds(rs=>[{id:"r"+Date.now(), ...form, year:+form.year, max_votantes:+form.max_votantes, is_active:false, is_closed:false, is_voting_open:false, join_locked:false, current_round_number:1, votes_current_round:0, created_at:new Date().toISOString()}, ...rs]);
        pushToast?.({kind:"ok", title:"Votación creada", desc:`Código de acceso: ${code}`});
      }} />
      <DeleteConfirm round={deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={()=>{ setRounds(rs=>rs.filter(r=>r.id!==deleteTarget.id)); pushToast?.({kind:"warn", title:"Votación eliminada"}); }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════
const MOCK_USERS = [
  { id:"u1", username:"hna.provincial", email:"provincial@consolacion.org", name:"Hna. María Alcántara", role:"super_admin", created_at:"2024-01-10T10:00:00Z" },
  { id:"u2", username:"secretaria.ece", email:"secretaria.ece@consolacion.org", name:"Hna. Teresa Benítez", role:"admin", created_at:"2024-03-22T08:00:00Z" },
  { id:"u3", username:"delegada.ecl", email:"delegada@consolacion.org", name:"Hna. Carmen Domínguez", role:"admin", created_at:"2024-05-15T09:30:00Z" },
  { id:"u4", username:"vocal.consejo", email:"vocal@consolacion.org", name:"Hna. Pilar Herrera", role:"admin", created_at:"2024-08-01T12:00:00Z" },
];

function PasswordDialog({ user, onClose, pushToast }) {
  const [pw, setPw] = useS("");
  const [loading, setLoading] = useS(false);
  if (!user) return null;
  const submit = () => {
    if (pw.length < 6) return;
    setLoading(true);
    setTimeout(()=>{ setLoading(false); pushToast?.({kind:"ok", title:"Contraseña actualizada", desc:user.name}); onClose(); }, 800);
  };
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="dialog-head">
          <h2>Cambiar contraseña</h2>
          <p>Actualiza las credenciales de <strong>{user.name}</strong> (@{user.username}).</p>
        </div>
        <div className="dialog-body">
          <div className="form-field">
            <label className="label">Nueva contraseña</label>
            <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={pw} onChange={e=>setPw(e.target.value)} />
            <div style={{fontSize:11.5, color:"var(--fg-muted)", marginTop:5}}>La contraseña debe tener al menos 6 caracteres.</div>
          </div>
        </div>
        <div className="dialog-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={pw.length<6||loading}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserManagement({ pushToast, isSuperAdmin = true }) {
  const [users, setUsers] = useS(MOCK_USERS);
  const [search, setSearch] = useS("");
  const [roleFilter, setRoleFilter] = useS("all");
  const [showCreate, setShowCreate] = useS(false);
  const [pwTarget, setPwTarget] = useS(null);
  const [creating, setCreating] = useS(false);
  const [form, setForm] = useS({name:"", username:"", email:"", password:"", role:"admin"});
  const upd = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const filtered = useM(()=>{
    const q = search.toLowerCase();
    return users.filter(u=>
      (!q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter==="all" || u.role===roleFilter)
    );
  }, [users, search, roleFilter]);

  if (!isSuperAdmin) {
    return (
      <div style={{padding:24}}>
        <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:24, display:"flex", alignItems:"center", gap:14}}>
          <div style={{width:40, height:40, borderRadius:"50%", background:"var(--bad-bg)", display:"grid", placeItems:"center"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style={{fontWeight:700, marginBottom:3}}>Acceso restringido</div>
            <div style={{fontSize:13, color:"var(--fg-muted)"}}>Solo los super administradores pueden gestionar usuarios.</div>
          </div>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (!form.name||!form.username||!form.email||!form.password) return;
    setCreating(true);
    setTimeout(()=>{
      setUsers(us=>[{id:"u"+Date.now(), ...form, created_at:new Date().toISOString()}, ...us]);
      setCreating(false); setShowCreate(false);
      setForm({name:"",username:"",email:"",password:"",role:"admin"});
      pushToast?.({kind:"ok", title:"Usuario creado", desc:form.name});
    }, 700);
  };

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"14px 20px", borderBottom:"1px solid var(--border)", background:"var(--bg-elev)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--fg-subtle)"}}>Usuarios</span>
          <span className="chip chip-muted">{users.length} total</span>
          <span className="chip" style={{background:"color-mix(in oklch, oklch(0.55 0.18 280) 12%, transparent)", color:"oklch(0.45 0.18 280)", borderColor:"color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)"}}>{users.filter(u=>u.role==="super_admin").length} super admin</span>
        </div>
        <div style={{flex:1}} />
        <div className="search-wrap" style={{width:200}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--fg-faint)", pointerEvents:"none"}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="input" style={{paddingLeft:30}} placeholder="Buscar usuario..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          <button className={roleFilter==="all"?"active":""} onClick={()=>setRoleFilter("all")}>Todos</button>
          <button className={roleFilter==="super_admin"?"active":""} onClick={()=>setRoleFilter("super_admin")}>Super Admin</button>
          <button className={roleFilter==="admin"?"active":""} onClick={()=>setRoleFilter("admin")}>Admin</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(p=>!p)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
          {showCreate ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      <div style={{flex:1, padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:16}} className="scroll-thin">
        {/* Create form */}
        {showCreate && (
          <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden"}}>
            <div style={{padding:"12px 16px", borderBottom:"1px solid var(--border-soft)", display:"flex", alignItems:"center", gap:10}}>
              <div style={{width:3, height:20, borderRadius:2, background:"linear-gradient(180deg, var(--brand-400), var(--brand-600))"}} />
              <span style={{fontWeight:700, fontSize:13}}>Crear nuevo usuario</span>
              <span style={{fontSize:12, color:"var(--fg-muted)"}}>Completa todos los campos.</span>
            </div>
            <div style={{padding:"14px 16px"}}>
              <div className="form-grid">
                <div className="form-grid form-grid-2">
                  <div className="form-field"><label className="label">Nombre completo</label><input className="input" placeholder="Hna. María García" value={form.name} onChange={upd("name")} /></div>
                  <div className="form-field"><label className="label">Usuario</label><input className="input" placeholder="hna.garcia" value={form.username} onChange={upd("username")} /></div>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-field"><label className="label">Email</label><input className="input" type="email" placeholder="garcia@consolacion.org" value={form.email} onChange={upd("email")} /></div>
                  <div className="form-field"><label className="label">Contraseña</label><input className="input" type="password" placeholder="Mín. 6 caracteres" value={form.password} onChange={upd("password")} /></div>
                </div>
                <div className="form-field" style={{maxWidth:220}}>
                  <label className="label">Rol</label>
                  <select className="input" value={form.role} onChange={upd("role")}>
                    <option value="admin">Administrador</option>
                    <option value="super_admin">Super Administrador</option>
                  </select>
                </div>
                <div style={{display:"flex", justifyContent:"flex-end", gap:8}}>
                  <button className="btn" onClick={()=>setShowCreate(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                    {creating ? "Creando..." : "Crear usuario"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {filtered.length === 0 ? (
          <div className="empty"><svg width="28" height="28" opacity="0.3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p className="empty-title">Sin usuarios</p><p className="empty-sub">Crea el primer usuario desde el formulario.</p></div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px,1fr))", gap:10}}>
            {filtered.map(u=>{
              const isRoot = u.role === "super_admin";
              return (
                <div key={u.id} style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden"}}>
                  <div style={{padding:"12px 14px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--border-soft)"}}>
                    <div style={{width:38, height:38, borderRadius:"50%", background: isRoot ? "color-mix(in oklch, oklch(0.55 0.18 280) 14%, transparent)" : "var(--brand-bg)", border:`1px solid ${isRoot ? "color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)" : "var(--brand-border)"}`, display:"grid", placeItems:"center", flexShrink:0}}>
                      {isRoot
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="oklch(0.5 0.18 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontWeight:700, fontSize:14, letterSpacing:"-0.005em", color:"var(--fg)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{u.name}</div>
                      <div style={{fontSize:12, color:"var(--fg-muted)", fontFamily:"var(--font-mono)", marginTop:1}}>@{u.username}</div>
                    </div>
                    <span className={`chip ${isRoot ? "" : "chip-brand"}`} style={isRoot ? {background:"color-mix(in oklch, oklch(0.55 0.18 280) 12%, transparent)", color:"oklch(0.45 0.18 280)", borderColor:"color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)"} : {}}>
                      {isRoot ? "Super Admin" : "Admin"}
                    </span>
                  </div>
                  <div style={{padding:"10px 14px", display:"flex", alignItems:"center", gap:10, justifyContent:"space-between"}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:"var(--fg-muted)", minWidth:0}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{u.email}</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:6, flexShrink:0}}>
                      <span style={{fontSize:11, color:"var(--fg-faint)"}}>{new Date(u.created_at).toLocaleDateString("es-ES")}</span>
                      <button className="btn btn-sm" onClick={()=>setPwTarget(u)} style={{gap:5}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><line x1="10.85" y1="12.15" x2="19" y2="4"/><line x1="18" y1="5" x2="20" y2="7"/><line x1="15" y1="8" x2="17" y2="10"/></svg>
                        Contraseña
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PasswordDialog user={pwTarget} onClose={()=>setPwTarget(null)} pushToast={pushToast} />
    </div>
  );
}

Object.assign(window, { LoginPage, LoadingState, AccessDenied, AdminVotingList, UserManagement });
