import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ComunicaImport } from '@/components/admin/ComunicaImport';
import { isSupabaseConfigured } from '@/lib/supabase';

export function ComunicaRouter() {
  const { adminUser, loading, isAdmin } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
        <div className="w-full max-w-[420px] bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] px-6 py-7 text-center shadow-[var(--avd-shadow-md)]">
          <div className="font-bold text-base text-[var(--avd-fg)] mb-1.5">Supabase no configurado</div>
          <div className="text-[13px] text-[var(--avd-fg-muted)] leading-[1.55]">
            Configura las variables de entorno <span className="font-[var(--avd-font-mono)] text-xs">VITE_SUPABASE_URL</span> y{' '}
            <span className="font-[var(--avd-font-mono)] text-xs">VITE_SUPABASE_ANON_KEY</span> para usar esta sección.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
        <div className="text-center flex flex-col items-center gap-[14px]">
          <div className="w-9 h-9 rounded-full border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] animate-spin [animation-duration:0.7s]" />
          <div className="text-[13px] text-[var(--avd-fg-muted)] font-medium">Cargando...</div>
        </div>
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
        <div className="w-full max-w-[420px] text-center">
          <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] overflow-hidden shadow-[var(--avd-shadow-md)]">
            <div className="h-[3px] bg-gradient-to-r from-[var(--avd-bad-500)] to-[oklch(0.66_0.22_28)]" />
            <div className="px-7 pt-8 pb-7 flex flex-col items-center gap-4">
              <div className="w-[58px] h-[58px] rounded-full bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] grid place-items-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              </div>
              <div>
                <div className="text-[20px] font-bold tracking-[-0.015em] text-[var(--avd-fg)] mb-1.5">Acceso Denegado</div>
                <div className="text-[13.5px] text-[var(--avd-fg-muted)] leading-[1.55]">Solo los administradores pueden acceder a esta sección.</div>
              </div>
              <button className="avd-btn mt-1 gap-1.5" onClick={() => { window.location.href = '/'; }}>
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
