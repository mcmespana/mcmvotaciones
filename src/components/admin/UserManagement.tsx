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
      <div className="avd-dialog" style={{maxWidth:440}} onClick={e => e.stopPropagation()}>
        <div className="avd-dialog-head">
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <div style={{width:34, height:34, borderRadius:"50%", background:"var(--avd-brand-bg)", border:"1px solid var(--avd-brand-border)", display:"grid", placeItems:"center", flexShrink:0}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><line x1="10.85" y1="12.15" x2="19" y2="4"/><line x1="18" y1="5" x2="20" y2="7"/><line x1="15" y1="8" x2="17" y2="10"/></svg>
            </div>
            <div>
              <h2 style={{margin:0}}>Cambiar contraseña</h2>
              <p style={{margin:0}}>Credenciales de <strong>{user.name}</strong> (@{user.username}).</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="avd-dialog-body">
            <div className="avd-form-field">
              <label className="avd-label">Nueva contraseña</label>
              <input className="avd-input" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} disabled={loading} />
              <div style={{fontSize:11.5, color:"var(--avd-fg-muted)", marginTop:4}}>La contraseña debe tener al menos 6 caracteres.</div>
            </div>
            {error && (
              <div style={{display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 30%, transparent)", color:"var(--avd-bad-fg)", fontSize:12.5}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
          </div>
          <div className="avd-dialog-foot">
            <button type="button" className="avd-btn" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="avd-btn avd-btn-primary" disabled={pw.length < 6 || loading}>
              {loading ? (
                <span style={{display:"flex", alignItems:"center", gap:6}}>
                  <svg style={{animation:"spin 0.8s linear infinite"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
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
      console.error(err);
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
      <div style={{padding:24}}>
        <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-md)", padding:24, display:"flex", alignItems:"center", gap:14}}>
          <div style={{width:40, height:40, borderRadius:"50%", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 25%, transparent)", display:"grid", placeItems:"center", flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </div>
          <div>
            <div style={{fontWeight:700, marginBottom:3, color:"var(--avd-fg)"}}>Acceso restringido</div>
            <div style={{fontSize:13, color:"var(--avd-fg-muted)"}}>Solo los super administradores pueden gestionar usuarios.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column"}}>
      {/* Toolbar */}
      <div style={{padding:"14px 20px", borderBottom:"1px solid var(--avd-border)", background:"var(--avd-bg-elev)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--avd-fg-muted)"}}>Usuarios</span>
          <span className="avd-chip">{users.length} total</span>
          <span className="avd-chip" style={{background:"color-mix(in oklch, oklch(0.55 0.18 280) 12%, transparent)", color:"oklch(0.45 0.18 280)", borderColor:"color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)"}}>
            {users.filter(u => u.role === 'super_admin').length} super admin
          </span>
        </div>
        <div style={{flex:1}} />
        <div className="avd-search-wrap" style={{width:200, position:"relative"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--avd-fg-faint)", pointerEvents:"none"}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="avd-input" style={{paddingLeft:30}} placeholder="Buscar usuario..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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

      <div style={{flex:1, padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:16}}>
        {/* Create form */}
        {showCreateForm && (
          <div style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-md)", overflow:"hidden"}}>
            <div style={{padding:"12px 16px", borderBottom:"1px solid var(--avd-border-soft)", display:"flex", alignItems:"center", gap:10}}>
              <div style={{width:3, height:20, borderRadius:2, background:"linear-gradient(180deg, var(--avd-brand-400), var(--avd-brand-600))"}} />
              <span style={{fontWeight:700, fontSize:13, color:"var(--avd-fg)"}}>Crear nuevo usuario</span>
              <span style={{fontSize:12, color:"var(--avd-fg-muted)"}}>Completa todos los campos.</span>
            </div>
            <div style={{padding:"14px 16px"}}>
              <form onSubmit={handleCreateUser}>
                <div className="avd-form-grid">
                  <div className="avd-form-grid-2">
                    <div className="avd-form-field">
                      <label className="avd-label">Nombre completo</label>
                      <input className="avd-input" placeholder="Hna. María García" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} disabled={creating} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Usuario</label>
                      <input className="avd-input" placeholder="hna.garcia" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} disabled={creating} />
                    </div>
                  </div>
                  <div className="avd-form-grid-2">
                    <div className="avd-form-field">
                      <label className="avd-label">Email</label>
                      <input className="avd-input" type="email" placeholder="garcia@consolacion.org" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} disabled={creating} />
                    </div>
                    <div className="avd-form-field">
                      <label className="avd-label">Contraseña</label>
                      <input className="avd-input" type="password" placeholder="Mín. 6 caracteres" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} disabled={creating} />
                    </div>
                  </div>
                  <div className="avd-form-field" style={{maxWidth:220}}>
                    <label className="avd-label">Rol</label>
                    <select className="avd-select" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'admin' | 'super_admin'})} disabled={creating}>
                      <option value="admin">Administrador</option>
                      <option value="super_admin">Super Administrador</option>
                    </select>
                  </div>
                  {createError && (
                    <div style={{display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:"var(--avd-radius-sm)", background:"var(--avd-bad-bg)", border:"1px solid color-mix(in oklch, var(--avd-bad) 30%, transparent)", color:"var(--avd-bad-fg)", fontSize:12.5}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {createError}
                    </div>
                  )}
                  <div style={{display:"flex", justifyContent:"flex-end", gap:8}}>
                    <button type="button" className="avd-btn" onClick={() => { setShowCreateForm(false); setCreateError(''); }} disabled={creating}>Cancelar</button>
                    <button type="submit" className="avd-btn avd-btn-primary" disabled={creating}>
                      {creating ? (
                        <span style={{display:"flex", alignItems:"center", gap:6}}>
                          <svg style={{animation:"spin 0.8s linear infinite"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
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
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 0", gap:12}}>
            <div style={{width:32, height:32, border:"2.5px solid var(--avd-border)", borderTopColor:"var(--avd-brand)", borderRadius:"50%", animation:"spin 0.7s linear infinite"}} />
            <span style={{fontSize:13, color:"var(--avd-fg-muted)"}}>Cargando usuarios...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="avd-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="avd-empty-title">Sin usuarios</p>
            <p className="avd-empty-sub">Crea el primer usuario desde el formulario.</p>
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px,1fr))", gap:10}}>
            {filteredUsers.map(u => {
              const isRoot = u.role === 'super_admin';
              return (
                <div key={u.id} style={{background:"var(--avd-surface)", border:"1px solid var(--avd-border)", borderRadius:"var(--avd-radius-md)", overflow:"hidden"}}>
                  <div style={{padding:"12px 14px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--avd-border-soft)"}}>
                    <div style={{
                      width:38, height:38, borderRadius:"50%", flexShrink:0, display:"grid", placeItems:"center",
                      background: isRoot ? "color-mix(in oklch, oklch(0.55 0.18 280) 14%, transparent)" : "var(--avd-brand-bg)",
                      border: `1px solid ${isRoot ? "color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)" : "var(--avd-brand-border)"}`,
                    }}>
                      {isRoot
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="oklch(0.5 0.18 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      }
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontWeight:700, fontSize:14, letterSpacing:"-0.005em", color:"var(--avd-fg)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{u.name}</div>
                      <div style={{fontSize:12, color:"var(--avd-fg-muted)", fontFamily:"var(--avd-font-mono)", marginTop:1}}>@{u.username}</div>
                    </div>
                    <span className="avd-chip" style={isRoot
                      ? {background:"color-mix(in oklch, oklch(0.55 0.18 280) 12%, transparent)", color:"oklch(0.45 0.18 280)", borderColor:"color-mix(in oklch, oklch(0.55 0.18 280) 30%, transparent)"}
                      : {}
                    }>
                      {isRoot ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  <div style={{padding:"10px 14px", display:"flex", alignItems:"center", gap:10, justifyContent:"space-between"}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:"var(--avd-fg-muted)", minWidth:0}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{u.email}</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:6, flexShrink:0}}>
                      <span style={{fontSize:11, color:"var(--avd-fg-faint)"}}>{new Date(u.created_at).toLocaleDateString('es-ES')}</span>
                      <button className="avd-btn avd-btn-sm" onClick={() => setPasswordTargetUser(u)} style={{gap:5}}>
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
