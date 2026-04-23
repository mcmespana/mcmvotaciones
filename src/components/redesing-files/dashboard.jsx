// AdminDashboard — panel principal con tabs
const { useState: useSD, useEffect: useED } = React;

const DASH_STATS = { totalRounds: 5, activeRounds: 2, totalVotes: 183, totalCandidates: 48 };

const RECENT_ACTIVITY = [
  { id:1, icon:"ok",   text:"Votación 'Capítulo Provincial ECE' iniciada",     time:"Hace 12 min" },
  { id:2, icon:"brand",text:"Candidata María Alcántara seleccionada en Ronda 2",time:"Hace 28 min" },
  { id:3, icon:"warn", text:"Ronda 1 finalizada · ECE 2026",                   time:"Hace 1 h"    },
  { id:4, icon:"ok",   text:"32 votantes conectados · sala ECL abierta",        time:"Hace 2 h"    },
  { id:5, icon:"bad",  text:"Votación 'Renovación Comisión' cerrada",           time:"Ayer 18:42"  },
];

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10, position:"relative", overflow:"hidden"}}>
      <div style={{position:"absolute", top:0, left:0, right:0, height:2.5, background:`linear-gradient(90deg, var(--${accent}-400,var(--brand-400)), var(--${accent}-600,var(--brand-600)))`, opacity:0.85}} />
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--fg-subtle)"}}>{label}</div>
        {icon}
      </div>
      <div style={{fontSize:38, fontWeight:800, letterSpacing:"-0.03em", fontVariantNumeric:"tabular-nums", lineHeight:1, color:"var(--fg)"}}>{value}</div>
      <div style={{fontSize:12, color:"var(--fg-muted)", fontWeight:500}}>{sub}</div>
    </div>
  );
}

function ActionCard({ title, desc, icon, btnLabel, btnVariant, onClick }) {
  return (
    <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"18px", display:"flex", flexDirection:"column", gap:12, transition:"border-color 0.15s, box-shadow 0.15s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand-border)"; e.currentTarget.style.boxShadow="var(--shadow-sm)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.boxShadow="none";}}>
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <div style={{width:34, height:34, borderRadius:"var(--radius-sm)", background:"var(--brand-bg)", border:"1px solid var(--brand-border)", display:"grid", placeItems:"center", color:"var(--brand)"}}>{icon}</div>
        <div style={{fontWeight:700, fontSize:14, letterSpacing:"-0.01em"}}>{title}</div>
      </div>
      <div style={{fontSize:13, color:"var(--fg-muted)", lineHeight:1.55}}>{desc}</div>
      <button className={`btn btn-block ${btnVariant === "primary" ? "btn-primary" : ""}`} style={{height:36, fontSize:13}} onClick={onClick}>{btnLabel}</button>
    </div>
  );
}

function AdminDashboard({ onNavigateVotingList, onOpenRound, pushToast, isSuperAdmin = true, userName = "Hna. María Alcántara" }) {
  const [tab, setTab] = useSD(() => localStorage.getItem("mcm-dash-tab") || "dashboard");
  const roleLabel = isSuperAdmin ? "Super Admin" : "Admin";

  const setTabPersist = (t) => { setTab(t); localStorage.setItem("mcm-dash-tab", t); };

  const TABS = [
    { id:"dashboard", label:"Dashboard", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { id:"votaciones", label:"Votaciones", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    ...(isSuperAdmin ? [{ id:"usuarios", label:"Usuarios", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }] : []),
  ];

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      {/* Header */}
      <div style={{padding:"16px 24px 14px", borderBottom:"1px solid var(--border)", background:"var(--bg-elev)"}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:14}}>
          <div>
            <div style={{fontSize:20, fontWeight:800, letterSpacing:"-0.02em", color:"var(--fg)", lineHeight:1.1}}>Panel de Administración</div>
            <div style={{fontSize:13, color:"var(--fg-muted)", marginTop:3}}>Bienvenida, {userName} · <span style={{fontWeight:600, color:"var(--brand)"}}>{roleLabel}</span></div>
          </div>
          <button className="btn btn-sm" onClick={()=>pushToast?.({kind:"warn", title:"Sesión cerrada"})} style={{gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </button>
        </div>

        {/* Summary chips */}
        <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
          {[
            {l:"Rondas", v:DASH_STATS.totalRounds},
            {l:"Activas", v:DASH_STATS.activeRounds, cls:"chip-ok"},
            {l:"Votos", v:DASH_STATS.totalVotes},
            {l:"Candidatos", v:DASH_STATS.totalCandidates},
          ].map(c=>(
            <span key={c.l} className={`chip ${c.cls||"chip-muted"}`}>
              <span style={{textTransform:"uppercase", fontSize:9.5, letterSpacing:"0.07em", fontWeight:700, opacity:0.7}}>{c.l}</span>
              <span style={{fontWeight:800}}>{c.v}</span>
            </span>
          ))}
          <span className="chip chip-ok" style={{display:"flex", alignItems:"center", gap:5}}>
            <span className="pulse-dot" />
            Sistema operativo
          </span>
        </div>

        {/* Tabs */}
        <div style={{display:"flex", gap:2, background:"var(--bg-sunken)", border:"1px solid var(--border-soft)", borderRadius:"var(--radius-sm)", padding:3, width:"fit-content"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTabPersist(t.id)}
              style={{display:"flex", alignItems:"center", gap:6, height:30, padding:"0 14px", borderRadius:"var(--radius-xs)", fontSize:13, fontWeight:600, cursor:"pointer", border:"none", transition:"all 0.15s",
                background: tab===t.id ? "var(--bg-elev)" : "transparent",
                color: tab===t.id ? "var(--fg)" : "var(--fg-muted)",
                boxShadow: tab===t.id ? "var(--shadow-xs)" : "none",
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1, overflowY:"auto"}} className="scroll-thin">
        {tab === "dashboard" && (
          <div style={{padding:24, display:"flex", flexDirection:"column", gap:20}}>
            {/* Stats grid */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12}}>
              <StatCard label="Votaciones totales" value={DASH_STATS.totalRounds} sub={`${DASH_STATS.activeRounds} activas ahora`} accent="brand"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
              <StatCard label="Votos emitidos" value={DASH_STATS.totalVotes} sub="Total acumulado" accent="ok"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} />
              <StatCard label="Candidatos" value={DASH_STATS.totalCandidates} sub="En todas las rondas" accent="brand"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
              <StatCard label="Estado del sistema" value={<span style={{color:"var(--ok)"}}>●</span>} sub="Todos los servicios operativos" accent="ok"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>} />
            </div>

            {/* Action cards */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:12}}>
              <ActionCard title="Nueva votación" desc="Crea una nueva ronda de votación con candidatos y configura el censo." icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>} btnLabel="Crear votación" btnVariant="primary" onClick={()=>setTabPersist("votaciones")} />
              <ActionCard title="Ver resultados" desc="Consulta el historial y análisis de las votaciones realizadas." icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} btnLabel="Ver votaciones" onClick={()=>setTabPersist("votaciones")} />
              <ActionCard title="Exportar datos" desc="Descarga todos los resultados en formato JSON para análisis externo." icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} btnLabel="Exportar JSON" onClick={()=>pushToast?.({kind:"ok", title:"Exportando datos…"})} />
            </div>

            {/* Recent activity */}
            <div style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden"}}>
              <div style={{padding:"12px 16px", borderBottom:"1px solid var(--border-soft)", display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontSize:13, fontWeight:700}}>Actividad reciente</span>
                <span className="chip chip-muted">{RECENT_ACTIVITY.length} eventos</span>
              </div>
              <div>
                {RECENT_ACTIVITY.map((a, i) => (
                  <div key={a.id} style={{display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderTop: i>0 ? "1px solid var(--border-soft)" : "none", fontSize:13}}>
                    <div style={{width:8, height:8, borderRadius:"50%", background: a.icon==="ok" ? "var(--ok)" : a.icon==="warn" ? "var(--warn)" : a.icon==="bad" ? "var(--bad)" : "var(--brand)", flexShrink:0}} />
                    <span style={{flex:1, color:"var(--fg)"}}>{a.text}</span>
                    <span style={{fontSize:11.5, color:"var(--fg-faint)", flexShrink:0, fontVariantNumeric:"tabular-nums"}}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "votaciones" && (
          <AdminVotingList onOpenRound={onOpenRound} pushToast={pushToast} isSuperAdmin={isSuperAdmin} />
        )}

        {tab === "usuarios" && isSuperAdmin && (
          <UserManagement pushToast={pushToast} isSuperAdmin={isSuperAdmin} />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard });
