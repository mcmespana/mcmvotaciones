import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { AdminDashboard } from './AdminDashboard';
import { AdminVotingDetail } from './AdminVotingDetail';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AdminRouter() {
  const { adminUser, loading, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('adminMode', 'true');
    return () => {
      if (!location.pathname.startsWith('/admin')) {
        localStorage.removeItem('adminMode');
      }
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--avd-bg)", fontFamily:"var(--avd-font-sans)"}}>
        <div style={{textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:16}}>
          <div style={{width:40, height:40, border:"2.5px solid var(--avd-border)", borderTopColor:"var(--avd-brand)", borderRadius:"50%", animation:"spin 0.7s linear infinite"}} />
          <div style={{fontSize:14, color:"var(--avd-fg-muted)", fontWeight:500}}>Verificando credenciales…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <Routes>
        <Route path="/*" element={<AuthForm />} />
      </Routes>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--avd-bg)", fontFamily:"var(--avd-font-sans)"}}>
        <div style={{width:"100%", maxWidth:420, textAlign:"center"}}>
          <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-lg)", overflow:"hidden", boxShadow:"var(--avd-shadow-md)"}}>
            <div style={{height:3, background:"linear-gradient(90deg, var(--avd-bad-500), oklch(0.66 0.22 28))"}} />
            <div style={{padding:"32px 28px 28px", display:"flex", flexDirection:"column", alignItems:"center", gap:18}}>
              <div style={{width:64, height:64, borderRadius:"50%", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 25%, transparent)", display:"grid", placeItems:"center"}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              </div>
              <div>
                <div style={{fontSize:20, fontWeight:700, letterSpacing:"-0.015em", color:"var(--avd-fg)", marginBottom:6}}>Acceso Denegado</div>
                <div style={{fontSize:13.5, color:"var(--avd-fg-muted)", lineHeight:1.55, maxWidth:"30ch", margin:"0 auto"}}>No tienes permisos para acceder al panel de administración. Solo los administradores pueden entrar.</div>
              </div>
              <span className="avd-chip avd-chip-bad" style={{height:26, fontSize:12, fontWeight:700}}>Sin permisos de administración</span>
              <button
                className="avd-btn"
                onClick={() => { localStorage.removeItem('adminMode'); window.location.href = '/'; }}
                style={{marginTop:4, gap:6}}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Volver a la página principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/votaciones/:roundId" element={<AdminVotingDetail />} />
      <Route path="/*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
