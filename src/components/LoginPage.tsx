import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SupabaseConfigAlert } from './SupabaseConfigAlert';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Completa todos los campos.'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await signIn(username, password);
      if (signInError) setError(signInError.message || 'Credenciales incorrectas.');
    } catch {
      setError('Error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--avd-bg)", fontFamily:"var(--avd-font-sans)"}}>
      <div style={{width:"100%", maxWidth:400}}>
        <div style={{marginBottom:16}}>
          <SupabaseConfigAlert />
        </div>

        {/* Brand mark */}
        <div style={{textAlign:"center", marginBottom:32}}>
          <div style={{width:52, height:52, borderRadius:14, background:"linear-gradient(135deg, var(--avd-brand-400), var(--avd-brand-700))", display:"grid", placeItems:"center", margin:"0 auto 14px", boxShadow:"0 8px 24px -8px color-mix(in oklch, var(--avd-brand-600) 60%, transparent), 0 1px 0 oklch(1 0 0 / 0.18) inset"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={{fontSize:19, fontWeight:800, letterSpacing:"-0.02em", color:"var(--avd-fg)"}}>VotacionesMCM</div>
          <div style={{fontSize:13, color:"var(--avd-fg-muted)", marginTop:4, fontWeight:500}}>Panel de administración · Backstage</div>
        </div>

        {/* Card */}
        <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-lg)", overflow:"hidden", boxShadow:"var(--avd-shadow-md)"}}>
          <div style={{height:3, background:"linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600), var(--avd-ok-500))"}} />

          <div style={{padding:"24px 28px 28px"}}>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:16, fontWeight:700, letterSpacing:"-0.01em", color:"var(--avd-fg)", marginBottom:3}}>Iniciar sesión</div>
              <div style={{fontSize:13, color:"var(--avd-fg-muted)"}}>Accede al sistema de gestión de votaciones</div>
            </div>

            <form onSubmit={handleSubmit} style={{display:"flex", flexDirection:"column", gap:14}}>
              <div className="avd-form-field">
                <label className="avd-label">Usuario</label>
                <div style={{position:"relative"}}>
                  <svg style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"var(--avd-fg-faint)", pointerEvents:"none"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input className="avd-input" style={{paddingLeft:32}} placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="avd-form-field">
                <label className="avd-label">Contraseña</label>
                <div style={{position:"relative"}}>
                  <svg style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"var(--avd-fg-faint)", pointerEvents:"none"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input className="avd-input" style={{paddingLeft:32, paddingRight:38}} type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--avd-fg-faint)", padding:2, display:"flex"}}>
                    {showPassword
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div style={{display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 30%, transparent)", color:"var(--avd-bad-fg)", fontSize:12.5}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="avd-btn avd-btn-primary avd-btn-block" style={{height:42, fontSize:14, fontWeight:700, marginTop:4, justifyContent:"center"}} disabled={loading}>
                {loading ? (
                  <span style={{display:"flex", alignItems:"center", gap:8}}>
                    <svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                    Iniciando sesión...
                  </span>
                ) : "Iniciar sesión"}
              </button>
            </form>

            <div style={{marginTop:18, textAlign:"center", fontSize:12, color:"var(--avd-fg-faint)"}}>
              Sistema de votaciones MCM · <span style={{fontFamily:"var(--avd-font-mono)", letterSpacing:"0.05em"}}>v2.0</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
