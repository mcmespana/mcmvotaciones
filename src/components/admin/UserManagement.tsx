import { errorLog } from '@/lib/logger';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

function PasswordDialog({ user, onClose, onSave }: { user: AdminUser | null; onClose: () => void; onSave: (id: string, pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!user) { setPw(''); setError(''); } }, [user]);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave(user.id, pw);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="avd-dialog max-w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="avd-dialog-head">
          <div className="flex items-center gap-[10px]">
            <div className="w-[34px] h-[34px] rounded-full bg-[var(--avd-brand-bg)] border border-[var(--avd-brand-border)] grid place-items-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><line x1="10.85" y1="12.15" x2="19" y2="4"/><line x1="18" y1="5" x2="20" y2="7"/><line x1="15" y1="8" x2="17" y2="10"/></svg>
            </div>
            <div>
              <h2 className="m-0">Cambiar contraseña</h2>
              <p className="m-0">Credenciales de <strong>{user.name}</strong> (@{user.username}).</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="avd-dialog-body">
            <div className="avd-form-field">
              <label className="avd-label">Nueva contraseña</label>
              <input className="avd-input" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} disabled={loading} />
              <div className="text-[11.5px] text-[var(--avd-fg-muted)] mt-1">La contraseña debe tener al menos 6 caracteres.</div>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-[9px] rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_30%,transparent)] text-[var(--avd-bad-fg)] text-[12.5px]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
          </div>
          <div className="avd-dialog-foot">
            <button type="button" className="avd-btn" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="avd-btn avd-btn-primary" disabled={pw.length < 6 || loading}>
              {loading ? (
                <span className="flex items-center gap-[6px]">
                  <svg className="[animation:spin_0.8s_linear_infinite]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                  Guardando...
                </span>
              ) : "Guardar contraseña"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', name: '', role: 'admin' as 'admin' | 'super_admin' });
  const [createError, setCreateError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'super_admin'>('all');
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUser | null>(null);

  const { isSuperAdmin, createAdminUser, changeUserPassword } = useAuth();

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, username, email, name, role, created_at')
        .order('created_at', { ascending: false });
      if (!error) setUsers(data || []);
    } catch (err) {
      errorLog(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.name) {
      setCreateError('Completa todos los campos.');
      return;
    }
    if (newUser.password.length < 6) {
      setCreateError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const { error } = await createAdminUser(newUser.username, newUser.password, newUser.name, newUser.email, newUser.role);
      if (error) {
        setCreateError(error.message);
      } else {
        setNewUser({ username: '', email: '', password: '', name: '', role: 'admin' });
        setShowCreateForm(false);
        await loadUsers();
      }
    } catch {
      setCreateError('Error inesperado al crear el usuario.');
    } finally {
      setCreating(false);
    }
  };

  const handlePasswordSave = async (userId: string, pw: string) => {
    const { error } = await changeUserPassword(userId, pw);
    if (error) throw new Error(error.message);
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      (!q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter === 'all' || u.role === roleFilter)
    );
  }, [users, searchQuery, roleFilter]);

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-md)] p-6 flex items-center gap-[14px]">
          <div className="w-10 h-10 rounded-full bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] grid place-items-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </div>
          <div>
            <div className="font-bold mb-[3px] text-[var(--avd-fg)]">Acceso restringido</div>
            <div className="text-[13px] text-[var(--avd-fg-muted)]">Solo los super administradores pueden gestionar usuarios.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="px-5 py-[14px] border-b border-[var(--avd-border)] bg-[var(--avd-bg-elev)] flex flex-wrap sm:flex-nowrap items-center gap-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--avd-fg-muted)]">Usuarios</span>
          <span className="avd-chip">{users.length} total</span>
          <span className="avd-chip bg-[color-mix(in_oklch,oklch(0.55_0.18_280)_12%,transparent)] text-[oklch(0.45_0.18_280)] border-[color-mix(in_oklch,oklch(0.55_0.18_280)_30%,transparent)]">
            {users.filter(u => u.role === 'super_admin').length} super admin
          </span>
        </div>
        <div className="flex-1" />
        <div className="avd-search-wrap w-full sm:w-[200px] relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[var(--avd-fg-faint)] pointer-events-none"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="avd-input pl-[30px]" placeholder="Buscar usuario..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="avd-segmented">
          <button className={roleFilter === 'all' ? 'active' : ''} onClick={() => setRoleFilter('all')}>Todos</button>
          <button className={roleFilter === 'super_admin' ? 'active' : ''} onClick={() => setRoleFilter('super_admin')}>Super Admin</button>
          <button className={roleFilter === 'admin' ? 'active' : ''} onClick={() => setRoleFilter('admin')}>Admin</button>
        </div>
        <button className="avd-btn avd-btn-primary avd-btn-sm" onClick={() => { setShowCreateForm(p => !p); setCreateError(''); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
          {showCreateForm ? 'Cancelar' : 'Nuevo usuario'}
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Create form */}
        {showCreateForm && (
          <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-md)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--avd-border-soft)] flex items-center gap-[10px]">
              <div className="w-[3px] h-5 rounded-[2px] bg-gradient-to-b from-[var(--avd-brand-400)] to-[var(--avd-brand-600)]" />
              <span className="font-bold text-[13px] text-[var(--avd-fg)]">Crear nuevo usuario</span>
              <span className="text-[12px] text-[var(--avd-fg-muted)]">Completa todos los campos.</span>
            </div>
            <div className="px-4 py-[14px]">
              <form onSubmit={handleCreateUser}>
                <div className="avd-form-grid">
                  <div className="avd-form-grid-2 grid grid-cols-1 md:grid-cols-2">
                    <div className="avd-form-field">
                      <label className="avd-label">Nombre completo</label>
                      <input className="avd-input" placeholder="Hna. María García" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} disabled={creating} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Usuario</label>
                      <input className="avd-input" placeholder="hna.garcia" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} disabled={creating} />
                    </div>
                  </div>
                  <div className="avd-form-grid-2 grid grid-cols-1 md:grid-cols-2">
                    <div className="avd-form-field">
                      <label className="avd-label">Email</label>
                      <input className="avd-input" type="email" placeholder="garcia@consolacion.org" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} disabled={creating} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Contraseña</label>
                      <input className="avd-input" type="password" placeholder="Mín. 6 caracteres" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} disabled={creating} />
                    </div>
                  </div>
                  <div className="avd-form-field max-w-[220px]">
                    <label className="avd-label">Rol</label>
                    <select className="avd-select" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'admin' | 'super_admin'})} disabled={creating}>
                      <option value="admin">Administrador</option>
                      <option value="super_admin">Super Administrador</option>
                    </select>
                  </div>
                  {createError && (
                    <div className="flex items-center gap-2 px-3 py-[9px] rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_30%,transparent)] text-[var(--avd-bad-fg)] text-[12.5px]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {createError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button type="button" className="avd-btn" onClick={() => { setShowCreateForm(false); setCreateError(''); }} disabled={creating}>Cancelar</button>
                    <button type="submit" className="avd-btn avd-btn-primary" disabled={creating}>
                      {creating ? (
                        <span className="flex items-center gap-[6px]">
                          <svg className="[animation:spin_0.8s_linear_infinite]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                          Creando...
                        </span>
                      ) : "Crear usuario"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-[2.5px] border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full [animation:spin_0.7s_linear_infinite]" />
            <span className="text-[13px] text-[var(--avd-fg-muted)]">Cargando usuarios...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="avd-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="avd-empty-title">Sin usuarios</p>
            <p className="avd-empty-sub">Crea el primer usuario desde el formulario.</p>
          </div>
        ) : (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-[10px]">
            {filteredUsers.map(u => {
              const isRoot = u.role === 'super_admin';
              return (
                <div key={u.id} className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-md)] overflow-hidden">
                  <div className="px-[14px] py-3 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-[var(--avd-border-soft)]">
                    <div className={`w-[38px] h-[38px] rounded-full shrink-0 grid place-items-center ${isRoot ? 'bg-[color-mix(in_oklch,oklch(0.55_0.18_280)_14%,transparent)] border border-[color-mix(in_oklch,oklch(0.55_0.18_280)_30%,transparent)]' : 'bg-[var(--avd-brand-bg)] border border-[var(--avd-brand-border)]'}`}>
                      {isRoot
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="oklch(0.5 0.18 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] tracking-[-0.005em] text-[var(--avd-fg)] overflow-hidden text-ellipsis whitespace-nowrap">{u.name}</div>
                      <div className="text-[12px] text-[var(--avd-fg-muted)] font-[var(--avd-font-mono)] mt-px">@{u.username}</div>
                    </div>
                    <span className={`avd-chip ${isRoot ? 'bg-[color-mix(in_oklch,oklch(0.55_0.18_280)_12%,transparent)] text-[oklch(0.45_0.18_280)] border-[color-mix(in_oklch,oklch(0.55_0.18_280)_30%,transparent)]' : ''}`}>
                      {isRoot ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  <div className="px-[14px] py-[10px] flex items-center gap-[10px] justify-between">
                    <div className="flex items-center gap-[6px] text-[12.5px] text-[var(--avd-fg-muted)] min-w-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-[6px] shrink-0">
                      <span className="text-[11px] text-[var(--avd-fg-faint)]">{new Date(u.created_at).toLocaleDateString('es-ES')}</span>
                      <button className="avd-btn avd-btn-sm gap-[5px]" onClick={() => setPasswordTargetUser(u)}>
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

      <PasswordDialog
        user={passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
        onSave={handlePasswordSave}
      />
    </div>
  );
}
