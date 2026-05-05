import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminVotingDetail } from '@/components/admin/AdminVotingDetail';
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] animate-spin" style={{ animationDuration: "0.7s" }} />
          <div className="text-sm text-[var(--avd-fg-muted)] font-medium">Verificando credenciales…</div>
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
            <div className="px-7 pt-8 pb-7 flex flex-col items-center gap-[18px]">
              <div className="w-16 h-16 rounded-full bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] grid place-items-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              </div>
              <div>
                <div className="text-[20px] font-bold tracking-[-0.015em] text-[var(--avd-fg)] mb-1.5">Acceso Denegado</div>
                <div className="text-[13.5px] text-[var(--avd-fg-muted)] leading-[1.55] max-w-[30ch] mx-auto">No tienes permisos para acceder al panel de administración. Solo los administradores pueden entrar.</div>
              </div>
              <span className="avd-chip avd-chip-bad h-[26px] text-xs font-bold">Sin permisos de administración</span>
              <button
                className="avd-btn mt-1 gap-1.5"
                onClick={() => { localStorage.removeItem('adminMode'); window.location.href = '/'; }}
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
      <Route path="/" element={<Navigate to="/admin/votaciones" replace />} />
      <Route path="/dashboard" element={<Navigate to="/admin/votaciones" replace />} />
      <Route path="/votaciones" element={<AdminDashboard section="votaciones" />} />
      <Route path="/usuarios" element={<AdminDashboard section="usuarios" />} />
      <Route path="/votaciones/:roundId" element={<AdminVotingDetail />} />
      <Route path="/*" element={<Navigate to="/admin/votaciones" replace />} />
    </Routes>
  );
}
