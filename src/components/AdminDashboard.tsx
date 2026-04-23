import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from './UserManagement';
import { AdminVotingList } from './AdminVotingList';

interface DashboardStats {
  totalRounds: number;
  activeRounds: number;
  totalVotes: number;
  totalCandidates: number;
}

const RECENT_ACTIVITY = [
  { id: 1, kind: "ok",    text: "Sistema de votaciones activo" },
  { id: 2, kind: "brand", text: "Panel de administración cargado correctamente" },
];

export function AdminDashboard() {
  const { adminUser, isSuperAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') ?? 'dashboard');
  const [stats, setStats] = useState<DashboardStats>({ totalRounds: 0, activeRounds: 0, totalVotes: 0, totalCandidates: 0 });
  const [loading, setLoading] = useState(true);
  const roleLabel = adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin';

  useEffect(() => { loadStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data: rounds } = await supabase.from('rounds').select('id, is_active, is_closed');
      const { count: votesCount } = await supabase.from('votes').select('*', { count: 'exact', head: true });
      const { count: candidatesCount } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
      setStats({
        totalRounds: rounds?.length || 0,
        activeRounds: rounds?.filter(r => r.is_active && !r.is_closed).length || 0,
        totalVotes: votesCount || 0,
        totalCandidates: candidatesCount || 0,
      });
    } catch (error: unknown) {
      let msg = 'No se pudieron cargar las estadísticas';
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        msg = error.message;
      }
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast({ title: 'Error', description: 'Error al cerrar sesión', variant: 'destructive' });
  };

  const handleExportData = async () => {
    try {
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`id, title, description, is_active, is_closed, created_at,
          candidates!candidates_round_id_fkey (
            id, name, description, order_index,
            votes!votes_candidate_id_fkey (id, device_hash, created_at)
          )`);
      if (roundsError || !rounds?.length) {
        toast({ title: rounds?.length === 0 ? 'Sin datos' : 'Error', description: rounds?.length === 0 ? 'No hay datos para exportar' : 'No se pudieron exportar los datos', variant: roundsError ? 'destructive' : 'default' });
        return;
      }
      const exportData = {
        timestamp: new Date().toISOString(), stats,
        rounds: rounds.map(round => ({
          ...round,
          totalVotes: round.candidates.reduce((sum: number, c: { votes?: unknown[] }) => sum + (c.votes?.length || 0), 0),
          candidates: round.candidates.map((candidate: { votes?: Array<{ id: string; created_at: string }> }) => ({
            ...candidate,
            voteCount: candidate.votes?.length || 0,
            votes: candidate.votes?.map(vote => ({ id: vote.id, timestamp: vote.created_at })),
          })),
        })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `votaciones-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Exportación completada', description: 'Los datos se han descargado correctamente' });
    } catch {
      toast({ title: 'Error', description: 'Error al exportar los datos', variant: 'destructive' });
    }
  };

  const TABS = [
    {
      id: "dashboard", label: "Dashboard",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
    {
      id: "votaciones", label: "Votaciones",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    },
    ...(isSuperAdmin ? [{
      id: "usuarios", label: "Usuarios",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    }] : []),
  ];

  if (loading) {
    return (
      <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--avd-bg)", fontFamily:"var(--avd-font-sans)"}}>
        <div style={{textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:16}}>
          <div style={{width:36, height:36, border:"2.5px solid var(--avd-border)", borderTopColor:"var(--avd-brand)", borderRadius:"50%", animation:"spin 0.7s linear infinite"}} />
          <div style={{fontSize:14, color:"var(--avd-fg-muted)", fontWeight:500}}>Cargando panel...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="adm-page">
      {/* Topbar */}
      <header className="adm-topbar">
        <div className="adm-brand">
          <div className="avd-brand-mark">C</div>
          <span>VotacionesMCM</span>
        </div>
        <nav className="adm-crumbs">
          <span className="sep">/</span>
          <span>Admin</span>
        </nav>
        <div className="adm-topbar-spacer" />
        <span className="avd-chip avd-chip-ok" style={{display:"flex", alignItems:"center", gap:5}}>
          <span className="avd-pulse-dot" style={{width:6, height:6}} />
          Sistema operativo
        </span>
        <button className="avd-btn avd-btn-sm" onClick={handleSignOut} style={{gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar sesión
        </button>
      </header>

      {/* Page header */}
      <div className="adm-page-header">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:14}}>
          <div>
            <div style={{fontSize:20, fontWeight:800, letterSpacing:"-0.02em", color:"var(--avd-fg)", lineHeight:1.1}}>Panel de Administración</div>
            <div style={{fontSize:13, color:"var(--avd-fg-muted)", marginTop:3}}>
              Bienvenida, {adminUser?.name} · <span style={{fontWeight:600, color:"var(--avd-brand)"}}>{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
          {[
            { l: "Rondas",     v: stats.totalRounds,    cls: "avd-chip-muted" },
            { l: "Activas",    v: stats.activeRounds,   cls: "avd-chip-ok" },
            { l: "Votos",      v: stats.totalVotes,     cls: "avd-chip-muted" },
            { l: "Candidatos", v: stats.totalCandidates, cls: "avd-chip-muted" },
          ].map(c => (
            <span key={c.l} className={`avd-chip ${c.cls}`}>
              <span style={{textTransform:"uppercase", fontSize:9.5, letterSpacing:"0.07em", fontWeight:700, opacity:0.7}}>{c.l}</span>
              <span style={{fontWeight:800}}>{c.v}</span>
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`adm-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="adm-body">
        {activeTab === "dashboard" && (
          <div className="adm-scroll" style={{padding:24}}>
            <div style={{display:"flex", flexDirection:"column", gap:20}}>
              {/* Stats grid */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12}}>
                {[
                  {
                    label: "Votaciones totales", value: stats.totalRounds, sub: `${stats.activeRounds} activas ahora`, accent: "brand",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  },
                  {
                    label: "Votos emitidos", value: stats.totalVotes, sub: "Total acumulado", accent: "ok",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  },
                  {
                    label: "Candidatos", value: stats.totalCandidates, sub: "En todas las rondas", accent: "brand",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  },
                  {
                    label: "Estado del sistema", value: <span style={{color:"var(--avd-ok)"}}>●</span>, sub: "Todos los servicios operativos", accent: "ok",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  },
                ].map(({ label, value, sub, accent, icon }) => (
                  <div key={label} className="adm-stat-card">
                    <div style={{position:"absolute", top:0, left:0, right:0, height:2.5, background:`linear-gradient(90deg, var(--avd-${accent}-400, var(--avd-brand-400)), var(--avd-${accent}-600, var(--avd-brand-600)))`, opacity:0.85}} />
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <div style={{fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--avd-fg-subtle)"}}>{label}</div>
                      {icon}
                    </div>
                    <div style={{fontSize:38, fontWeight:800, letterSpacing:"-0.03em", fontVariantNumeric:"tabular-nums", lineHeight:1, color:"var(--avd-fg)"}}>{value}</div>
                    <div style={{fontSize:12, color:"var(--avd-fg-muted)", fontWeight:500}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Action cards */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:12}}>
                {[
                  {
                    title: "Nueva votación",
                    desc: "Crea una nueva ronda de votación con candidatos y configura el censo.",
                    btnLabel: "Crear votación", btnPrimary: true, onClick: () => setActiveTab("votaciones"),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  },
                  {
                    title: "Ver resultados",
                    desc: "Consulta el historial y análisis de las votaciones realizadas.",
                    btnLabel: "Ver votaciones", btnPrimary: false, onClick: () => setActiveTab("votaciones"),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  },
                  {
                    title: "Exportar datos",
                    desc: "Descarga todos los resultados en formato JSON para análisis externo.",
                    btnLabel: "Exportar JSON", btnPrimary: false, onClick: handleExportData,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  },
                ].map(({ title, desc, btnLabel, btnPrimary, onClick, icon }) => (
                  <div key={title} className="adm-action-card">
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      <div style={{width:34, height:34, borderRadius:"var(--avd-radius-sm)", background:"var(--avd-brand-bg)", border:"1px solid var(--avd-brand-border)", display:"grid", placeItems:"center", color:"var(--avd-brand)"}}>{icon}</div>
                      <div style={{fontWeight:700, fontSize:14, letterSpacing:"-0.01em", color:"var(--avd-fg)"}}>{title}</div>
                    </div>
                    <div style={{fontSize:13, color:"var(--avd-fg-muted)", lineHeight:1.55}}>{desc}</div>
                    <button className={`avd-btn avd-btn-block${btnPrimary ? " avd-btn-primary" : ""}`} style={{height:36, fontSize:13, justifyContent:"center"}} onClick={onClick}>{btnLabel}</button>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-md)", overflow:"hidden"}}>
                <div style={{padding:"12px 16px", borderBottom:"1px solid var(--avd-border-soft)", display:"flex", alignItems:"center", gap:8}}>
                  <span style={{fontSize:13, fontWeight:700, color:"var(--avd-fg)"}}>Actividad reciente</span>
                  <span className="avd-chip avd-chip-muted">{RECENT_ACTIVITY.length} eventos</span>
                </div>
                <div>
                  {RECENT_ACTIVITY.map((a, i) => (
                    <div key={a.id} className="adm-activity-row" style={{borderTop: i > 0 ? "1px solid var(--avd-border-soft)" : "none"}}>
                      <div style={{width:8, height:8, borderRadius:"50%", background: a.kind === "ok" ? "var(--avd-ok)" : a.kind === "warn" ? "var(--avd-warn)" : a.kind === "bad" ? "var(--avd-bad)" : "var(--avd-brand)", flexShrink:0}} />
                      <span style={{flex:1, color:"var(--avd-fg)"}}>{a.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "votaciones" && (
          <div className="adm-body" style={{overflow:"visible"}}>
            <AdminVotingList />
          </div>
        )}

        {activeTab === "usuarios" && isSuperAdmin && (
          <div className="adm-scroll" style={{padding:0}}>
            <UserManagement />
          </div>
        )}
      </div>
    </div>
  );
}
