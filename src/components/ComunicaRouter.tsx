import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { ComunicaImport } from './ComunicaImport';
import { isSupabaseConfigured } from '@/lib/supabase';

export function ComunicaRouter() {
  const { adminUser, loading, isAdmin } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--avd-bg)', fontFamily: 'var(--avd-font-sans)' }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', padding: '28px 24px', textAlign: 'center', boxShadow: 'var(--avd-shadow-md)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--avd-fg)', marginBottom: 6 }}>Supabase no configurado</div>
          <div style={{ fontSize: 13, color: 'var(--avd-fg-muted)', lineHeight: 1.55 }}>
            Configura las variables de entorno <span style={{ fontFamily: 'var(--avd-font-mono)', fontSize: 12 }}>VITE_SUPABASE_URL</span> y{' '}
            <span style={{ fontFamily: 'var(--avd-font-mono)', fontSize: 12 }}>VITE_SUPABASE_ANON_KEY</span> para usar esta sección.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--avd-bg)', fontFamily: 'var(--avd-font-sans)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, border: '2.5px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div style={{ fontSize: 13, color: 'var(--avd-fg-muted)', fontWeight: 500 }}>Cargando...</div>
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--avd-bg)', fontFamily: 'var(--avd-font-sans)' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', overflow: 'hidden', boxShadow: 'var(--avd-shadow-md)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--avd-bad-500), oklch(0.66 0.22 28))' }} />
            <div style={{ padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--avd-bad-bg)', border: '1px solid color-mix(in oklch, var(--avd-bad) 25%, transparent)', display: 'grid', placeItems: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--avd-fg)', marginBottom: 6 }}>Acceso Denegado</div>
                <div style={{ fontSize: 13.5, color: 'var(--avd-fg-muted)', lineHeight: 1.55 }}>Solo los administradores pueden acceder a esta sección.</div>
              </div>
              <button className="avd-btn" onClick={() => { window.location.href = '/'; }} style={{ marginTop: 4, gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
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
      <Route path="/*" element={<ComunicaImport />} />
    </Routes>
  );
}
