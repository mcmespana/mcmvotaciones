import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  createAdminUser: (email: string, password: string, name: string, role: 'admin' | 'super_admin') => Promise<{ error?: AuthError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed property to check if user is admin
  const isAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  // Function to load user profile from public.users table
  const loadUserProfile = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    // Skip auth setup if Supabase is not configured
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') as AuthError };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') as AuthError };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    // If signup was successful and we have a user, create their profile
    if (!error && data.user) {
      try {
        // Wait a bit for the auth session to be properly established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            name: name,
            // Let the database trigger assign the role automatically
            // First user becomes super_admin, others become admin by default
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Return a more specific error for profile creation
          return { 
            error: new Error(`Failed to create user profile: ${profileError.message}`) as AuthError 
          };
        }
      } catch (profileError) {
        console.error('Unexpected error creating user profile:', profileError);
        return { 
          error: new Error('Unexpected error creating user profile') as AuthError 
        };
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') as AuthError };
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') as AuthError };
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const createAdminUser = async (email: string, password: string, name: string, role: 'admin' | 'super_admin') => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    // Only super admins can create other admin users
    if (!isSuperAdmin) {
      return { error: new Error('Access denied. Only super admins can create admin users.') as AuthError };
    }

    try {
      // For simplicity, we'll use the regular signup method and manually insert the user profile
      // In production, you might want to use the service role key for admin user creation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Create the user profile with specific role
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            name: name,
            role: role
          });

        if (profileError) {
          console.error('Error creating admin user profile:', profileError);
          return { 
            error: new Error(`Failed to create admin user profile: ${profileError.message}`) as AuthError 
          };
        }
      }

      return { error: undefined };
    } catch (error) {
      console.error('Error creating admin user:', error);
      return { 
        error: new Error('Unexpected error creating admin user') as AuthError 
      };
    }
  };

  const value = {
    user,
    session,
    userProfile,
    isAdmin,
    isSuperAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    createAdminUser,
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