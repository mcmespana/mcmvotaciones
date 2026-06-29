/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

interface AuthError {
  message: string;
}

interface AuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  createAdminUser: (username: string, password: string, name: string, email: string, role: 'admin' | 'super_admin') => Promise<{ error?: AuthError }>;
  changeUserPassword: (targetUserId: string, newPassword: string) => Promise<{ error?: AuthError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed properties to check if user is admin
  const isAdmin = adminUser?.role === 'super_admin' || adminUser?.role === 'admin';
  const isSuperAdmin = adminUser?.role === 'super_admin';

  // Load admin user from localStorage on init
  useEffect(() => {
    const savedUser = localStorage.getItem('mcm_admin_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAdminUser(user);
      } catch (error) {
        // Error parsing saved user - clean up localStorage
        localStorage.removeItem('mcm_admin_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase not configured' } };
    }

    try {
      // Call the verify_password function to authenticate
      const { data, error } = await supabase.rpc('authenticate_admin', {
        input_username: username,
        input_password: password
      });

      if (error) {
        // Authentication error
        return { error: { message: 'Error de autenticación' } };
      }

      if (!data || data.length === 0) {
        return { error: { message: 'Credenciales incorrectas' } };
      }

      const user = data[0];
      setAdminUser(user);
      localStorage.setItem('mcm_admin_user', JSON.stringify(user));
      
      return { error: undefined };
    } catch (error) {
      return { error: { message: 'Error inesperado al iniciar sesión' } };
    }
  };

  const signOut = async () => {
    setAdminUser(null);
    localStorage.removeItem('mcm_admin_user');
    return { error: undefined };
  };

  const createAdminUser = async (username: string, password: string, name: string, email: string, role: 'admin' | 'super_admin') => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase not configured' } };
    }

    // Only super admins can create other admin users (except for the first user)
    if (adminUser && !isSuperAdmin) {
      return { error: { message: 'Access denied. Only super admins can create admin users.' } };
    }

    try {
      const { error } = await supabase.rpc('admin_create_user', {
        p_actor_id: adminUser?.id ?? null,
        p_username: username,
        p_password: password, // Will be hashed by trigger
        p_name: name,
        p_email: email,
        p_role: role,
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('username_taken')) {
          return { error: { message: 'El nombre de usuario ya existe' } };
        } else if (msg.includes('email_taken')) {
          return { error: { message: 'El email ya existe' } };
        } else if (msg.includes('not_authorized')) {
          return { error: { message: 'Acceso denegado. Solo los super administradores pueden crear usuarios.' } };
        }
        return { error: { message: `Error creating admin user: ${msg}` } };
      }

      return { error: undefined };
    } catch (error) {
      return { error: { message: 'Unexpected error creating admin user' } };
    }
  };

  const changeUserPassword = async (targetUserId: string, newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase not configured' } };
    }

    if (!adminUser || !isSuperAdmin) {
      return { error: { message: 'Acceso denegado. Solo los super administradores pueden cambiar contraseñas.' } };
    }

    try {
      const { error } = await supabase.rpc('admin_change_password', {
        p_actor_id: adminUser?.id ?? null,
        p_target_id: targetUserId,
        p_new_password: newPassword,
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('not_authorized')) {
          return { error: { message: 'Acceso denegado. Solo los super administradores pueden cambiar contraseñas.' } };
        }
        return { error: { message: `Error cambiando la contraseña: ${msg}` } };
      }

      return { error: undefined };
    } catch (error) {
      return { error: { message: 'Error inesperado al cambiar contraseña' } };
    }
  };

  const value = {
    adminUser,
    isAdmin,
    isSuperAdmin,
    loading,
    signIn,
    signOut,
    createAdminUser,
    changeUserPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
