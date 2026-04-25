import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminVotingList } from '@/components/admin/AdminVotingList';

type AdminSection = 'votaciones' | 'usuarios';

interface AdminDashboardProps {
  section?: AdminSection;
}

export function AdminDashboard({ section = 'votaciones' }: AdminDashboardProps) {
  const { adminUser, isSuperAdmin, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const roleLabel = adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin';
  const activeSection: AdminSection = section === 'usuarios' && isSuperAdmin ? 'usuarios' : 'votaciones';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast({ title: 'Error', description: 'Error al cerrar sesión', variant: 'destructive' });
  };

  return (
    <div className="adm-page">
      {/* Topbar */}
      <header className="adm-topbar">
        <div className="adm-brand">
          <div className="avd-brand-mark">C</div>
          <span>VotacionesMCM</span>
        </div>
        <div className="adm-topbar-spacer" />
        <button
          className="avd-btn avd-btn-ghost avd-btn-icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Cambiar tema"
          style={{ width: 32, height: 32, padding: 0 }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="avd-btn avd-btn-sm" onClick={handleSignOut} style={{gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar sesión
        </button>
      </header>

      {/* Page header */}
      <div className="adm-page-header">
        {activeSection === 'usuarios' && (
          <button
            className="avd-btn avd-btn-ghost avd-btn-sm"
            onClick={() => navigate('/admin/votaciones')}
            style={{marginBottom:10, gap:6}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Volver a votaciones
          </button>
        )}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16}}>
          <div>
            <div style={{fontSize:20, fontWeight:800, letterSpacing:"-0.02em", color:"var(--avd-fg)", lineHeight:1.1}}>
              {activeSection === 'votaciones' ? 'Votaciones' : 'Gestión de Usuarios'}
            </div>
            <div style={{fontSize:13, color:"var(--avd-fg-muted)", marginTop:3}}>
              Bienvenida, {adminUser?.name} · <span style={{fontWeight:600, color:"var(--avd-brand)"}}>{roleLabel}</span>
            </div>
          </div>
          {activeSection === 'votaciones' && isSuperAdmin && (
            <button
              className="avd-btn avd-btn-sm"
              onClick={() => navigate('/admin/usuarios')}
              style={{gap:6}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Usuarios
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="adm-body">
        {activeSection === 'votaciones' && (
          <div className="adm-body" style={{overflow:"visible"}}>
            <AdminVotingList />
          </div>
        )}

        {activeSection === 'usuarios' && isSuperAdmin && (
          <div className="adm-scroll" style={{padding:0}}>
            <UserManagement />
          </div>
        )}
      </div>
    </div>
  );
}
