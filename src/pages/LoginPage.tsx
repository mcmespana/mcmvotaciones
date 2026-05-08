import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SupabaseConfigAlert } from '@/components/shared/SupabaseConfigAlert';

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--avd-bg)] font-[var(--avd-font-sans)]">
      <div className="w-full max-w-[400px]">
        <div className="mb-4">
          <SupabaseConfigAlert />
        </div>

        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="login-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)]">VotacionesMCM</div>
          <div className="text-[13px] text-[var(--avd-fg-muted)] mt-1 font-medium">Panel de administración · Backstage</div>
        </div>

        {/* Card */}
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] overflow-hidden shadow-[var(--avd-shadow-md)]">
          <div className="h-[3px] bg-gradient-to-r from-[var(--avd-brand-400)] via-[var(--avd-brand-600)] to-[var(--avd-ok-500)]" />

          <div className="p-[24px_28px_28px]">
            <div className="mb-[22px]">
              <div className="text-[16px] font-bold tracking-[-0.01em] text-[var(--avd-fg)] mb-[3px]">Iniciar sesión</div>
              <div className="text-[13px] text-[var(--avd-fg-muted)]">Accede al sistema de gestión de votaciones</div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
              <div className="avd-form-field">
                <label className="avd-label">Usuario</label>
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--avd-fg-faint)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input className="avd-input !pl-8" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="avd-form-field">
                <label className="avd-label">Contraseña</label>
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--avd-fg-faint)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input className="avd-input !pl-8 !pr-9" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-[var(--avd-fg-faint)] p-0.5 flex items-center justify-center">
                    {showPassword
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-[9px] rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_30%,transparent)] text-[var(--avd-bad-fg)] text-[12.5px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="avd-btn avd-btn-primary avd-btn-block h-[42px] text-sm font-bold mt-1 justify-center" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                    Iniciando sesión...
                  </span>
                ) : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-[18px] text-center text-[12px] text-[var(--avd-fg-faint)]">
              Sistema de votaciones MCM · <span className="font-[var(--avd-font-mono)] tracking-[0.05em]">v2.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
