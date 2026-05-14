import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminVotingList } from '@/components/admin/AdminVotingList';
import { VotingTypesManager } from '@/components/admin/VotingTypesManager';

type AdminSection = 'votaciones' | 'usuarios';

interface AdminDashboardProps {
  section?: AdminSection;
}

export function AdminDashboard({ section = 'votaciones' }: AdminDashboardProps) {
  const { adminUser, isSuperAdmin, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [typesManagerOpen, setTypesManagerOpen] = useState(false);
  const [typesRefreshKey, setTypesRefreshKey] = useState(0);
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
          className="avd-btn avd-btn-ghost avd-btn-icon w-8 h-8 p-0"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="avd-btn avd-btn-sm gap-1.5" onClick={handleSignOut}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar sesión
        </button>
      </header>

      {/* Page header */}
      <div className="adm-page-header">
        {activeSection === 'usuarios' && (
          <button
            className="avd-btn avd-btn-ghost avd-btn-sm mb-2.5 gap-1.5"
            onClick={() => navigate('/admin/votaciones')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Volver a votaciones
          </button>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] leading-[1.1]">
              {activeSection === 'votaciones' ? 'Votaciones' : 'Gestión de Usuarios'}
            </div>
            <div className="text-[13px] text-[var(--avd-fg-muted)] mt-0.5">
              Bienvenida, {adminUser?.name} · <span className="font-semibold text-[var(--avd-brand)]">{roleLabel}</span>
            </div>
          </div>
          {activeSection === 'votaciones' && isSuperAdmin && (
            <div className="flex flex-col sm:flex-row gap-1.5 flex-wrap sm:gap-1">
              <button
                className="avd-btn avd-btn-sm gap-1.5"
                onClick={() => setTypesManagerOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                Tipos
              </button>
              <button
                className="avd-btn avd-btn-sm gap-1.5"
                onClick={() => navigate('/admin/usuarios')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Usuarios
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="adm-body">
        {activeSection === 'votaciones' && (
          <div className="adm-body overflow-visible">
            <AdminVotingList refreshTypesKey={typesRefreshKey} />
          </div>
        )}

        {activeSection === 'usuarios' && isSuperAdmin && (
          <div className="adm-scroll !p-0">
            <UserManagement />
          </div>
        )}
      </div>
      {isSuperAdmin && (
        <VotingTypesManager
          open={typesManagerOpen}
          onClose={() => setTypesManagerOpen(false)}
          isSuperAdmin={isSuperAdmin}
          onTypesChanged={() => setTypesRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
