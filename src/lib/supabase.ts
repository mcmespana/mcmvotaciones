import { createClient } from '@supabase/supabase-js';

// Safe check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Check if we have real Supabase configuration
const hasRealSupabaseConfig = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-url' &&
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key' &&
  !supabaseUrl.includes('tu-proyecto')
);

// Show warning if Supabase is not properly configured
if (!hasRealSupabaseConfig) {
  console.error(
    '%c⚠️ SUPABASE NO CONFIGURADO ⚠️',
    'background: #ff4444; color: white; font-size: 16px; font-weight: bold; padding: 10px;'
  );
  console.error(
    '%cDebes configurar las credenciales de Supabase para que la aplicación funcione.\n\n' +
    '📖 Sigue las instrucciones en SUPABASE_SETUP.md\n\n' +
    '1️⃣  Crea un archivo .env.local en la raíz del proyecto\n' +
    '2️⃣  Agrega tus credenciales de Supabase:\n' +
    '    VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    '    VITE_SUPABASE_ANON_KEY=tu-anon-key\n' +
    '3️⃣  Reinicia el servidor de desarrollo (npm run dev)\n\n' +
    '🔗 Más información: https://supabase.com/docs/guides/getting-started',
    'color: #ff4444; font-size: 14px;'
  );
}

// For the simplified authentication system, we consider it "configured" 
// if we have any valid-looking URL and key (even placeholders)
// This allows the login system to work with the new admin_users table
export const isSupabaseConfigured = hasRealSupabaseConfig;

// Create a dummy client if not configured to prevent errors
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Database types (will be expanded as we build the schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'super_admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'admin' | 'super_admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'super_admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      rounds: {
        Row: {
          id: string;
          title: string;
          description: string;
          year: number;
          team: string;
          expected_voters: number;
          is_active: boolean;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          year: number;
          team: string;
          expected_voters: number;
          is_active?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          year?: number;
          team?: string;
          expected_voters?: number;
          is_active?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
      };
      candidates: {
        Row: {
          id: string;
          round_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          round_id: string;
          candidate_id: string;
          device_hash: string;
          user_agent: string;
          ip_address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          candidate_id: string;
          device_hash: string;
          user_agent: string;
          ip_address: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          candidate_id?: string;
          device_hash?: string;
          user_agent?: string;
          ip_address?: string;
          created_at?: string;
        };
      };
      vote_history: {
        Row: {
          id: string;
          round_id: string;
          total_votes: number;
          results: Record<string, unknown>;
          exported_at: string;
          exported_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          total_votes: number;
          results: Record<string, unknown>;
          exported_at: string;
          exported_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          total_votes?: number;
          results?: Record<string, unknown>;
          exported_at?: string;
          exported_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_vote_results: {
        Args: { round_id: string };
        Returns: {
          candidate_id: string;
          candidate_name: string;
          vote_count: number;
        }[];
      };
    };
    Enums: {
      user_role: 'admin' | 'super_admin';
    };
  };
}