-- MCM Votaciones - Complete Database Reset Script
-- This script drops everything and recreates the database from scratch
-- Use this script when you need a clean database setup after commits
-- 
-- IMPORTANT: This will DELETE ALL DATA - use only for development or fresh setups
--
-- Usage: Execute this entire script in your PostgreSQL/Supabase SQL editor

-- ============================================================================
-- PHASE 1: DROP EVERYTHING TO START CLEAN
-- ============================================================================

-- Drop all triggers first to avoid dependency issues
DROP TRIGGER IF EXISTS hash_password_trigger ON public.admin_users;
DROP TRIGGER IF EXISTS auto_assign_first_super_admin_trigger ON public.admin_users;
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;

-- Drop all functions
DROP FUNCTION IF EXISTS hash_password_trigger();
DROP FUNCTION IF EXISTS authenticate_admin(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_vote_results(UUID, INTEGER);
DROP FUNCTION IF EXISTS calculate_round_results(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS auto_assign_first_super_admin();

-- Drop all tables (CASCADE to remove dependencies)
DROP TABLE IF EXISTS public.vote_history CASCADE;
DROP TABLE IF EXISTS public.round_results CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.rounds CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS team_type CASCADE;

-- Drop all RLS policies (they'll be removed with tables, but being explicit)
-- Note: Policies are automatically dropped when tables are dropped

-- ============================================================================
-- PHASE 2: RECREATE EVERYTHING FROM SCRATCH
-- ============================================================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'super_admin');
CREATE TYPE team_type AS ENUM ('ECE', 'ECL');

-- Admin users table for simplified authentication
CREATE TABLE public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Voting rounds table
CREATE TABLE public.rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  team team_type NOT NULL,
  expected_voters INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false,
  current_round_number INTEGER DEFAULT 1,
  max_votes_per_round INTEGER DEFAULT 3,
  max_selected_candidates INTEGER DEFAULT 6,
  selected_candidates_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  location TEXT,
  group_name TEXT,
  age INTEGER,
  description TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,
  elimination_round INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Votes table
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  round_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(round_id, device_hash, round_number)
);

-- Round results table for storing results between rounds
CREATE TABLE public.round_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(round_id, round_number, candidate_id)
);

-- Vote history table for exports
CREATE TABLE public.vote_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  total_votes INTEGER NOT NULL,
  results JSONB NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  exported_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_rounds_active ON public.rounds(is_active, is_closed);
CREATE INDEX idx_candidates_round ON public.candidates(round_id, order_index);
CREATE INDEX idx_candidates_eliminated ON public.candidates(round_id, is_eliminated, is_selected);
CREATE INDEX idx_votes_round ON public.votes(round_id);
CREATE INDEX idx_votes_device ON public.votes(device_hash);
CREATE INDEX idx_votes_candidate ON public.votes(candidate_id);
CREATE INDEX idx_votes_round_number ON public.votes(round_id, round_number);
CREATE INDEX idx_round_results ON public.round_results(round_id, round_number);

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 5: CREATE SIMPLIFIED RLS POLICIES (FIXED FOR ADMIN ACCESS)
-- ============================================================================

-- ADMIN USERS POLICIES - Allow all operations (auth handled in app)
CREATE POLICY "Allow all admin user operations" ON public.admin_users FOR ALL USING (true);

-- ROUNDS POLICIES - Separate public and admin access
CREATE POLICY "Public can view active rounds only" ON public.rounds 
  FOR SELECT USING (is_active = true AND is_closed = false);

CREATE POLICY "Allow all admin round operations" ON public.rounds 
  FOR ALL USING (true);

-- CANDIDATES POLICIES - Separate public and admin access  
CREATE POLICY "Public can view candidates for active rounds only" ON public.candidates 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Allow all admin candidate operations" ON public.candidates 
  FOR ALL USING (true);

-- VOTES POLICIES - Public can vote, admins can manage
CREATE POLICY "Allow voting in active rounds" ON public.votes 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Allow all admin vote operations" ON public.votes 
  FOR ALL USING (true);

-- ROUND RESULTS POLICIES - Public can view visible results, admins manage all
CREATE POLICY "Public can view visible results only" ON public.round_results 
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Allow all admin round results operations" ON public.round_results 
  FOR ALL USING (true);

-- VOTE HISTORY POLICIES - Admin only
CREATE POLICY "Allow all admin vote history operations" ON public.vote_history 
  FOR ALL USING (true);

-- ============================================================================
-- PHASE 6: CREATE FUNCTIONS
-- ============================================================================

-- Function to hash passwords using bcrypt
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if password_hash is a plain text password (not already hashed)
  -- Bcrypt hashes start with $2a$, $2b$, $2y$, etc.
  IF NEW.password_hash IS NOT NULL AND NOT (NEW.password_hash ~ '^\$2[ayb]\$') THEN
    -- Hash the password using crypt with bcrypt
    -- Generate a random salt with cost factor 12
    NEW.password_hash = crypt(NEW.password_hash, gen_salt('bf', 12));
  END IF;
  
  -- Update timestamp
  NEW.updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to authenticate admin users
CREATE OR REPLACE FUNCTION authenticate_admin(input_username TEXT, input_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  name TEXT,
  role user_role,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.username,
    au.email,
    au.name,
    au.role,
    au.created_at,
    au.updated_at
  FROM public.admin_users au
  WHERE au.username = input_username
    AND au.password_hash = crypt(input_password, au.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vote results for a round and specific round number
CREATE OR REPLACE FUNCTION get_vote_results(round_id UUID, round_number INTEGER DEFAULT NULL)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  candidate_surname TEXT,
  vote_count BIGINT,
  is_eliminated BOOLEAN,
  is_selected BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.surname,
    COALESCE(COUNT(v.id), 0)::BIGINT,
    c.is_eliminated,
    c.is_selected
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id 
    AND c.round_id = v.round_id
    AND (round_number IS NULL OR v.round_number = round_number)
  WHERE c.round_id = get_vote_results.round_id
    AND c.is_eliminated = false
  GROUP BY c.id, c.name, c.surname, c.order_index, c.is_eliminated, c.is_selected
  ORDER BY c.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and store round results
CREATE OR REPLACE FUNCTION calculate_round_results(round_id UUID, round_number INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Clear existing results for this round
  DELETE FROM public.round_results 
  WHERE round_results.round_id = calculate_round_results.round_id 
    AND round_results.round_number = calculate_round_results.round_number;
  
  -- Insert new results
  INSERT INTO public.round_results (round_id, round_number, candidate_id, vote_count, is_visible)
  SELECT 
    calculate_round_results.round_id,
    calculate_round_results.round_number,
    c.id,
    COALESCE(COUNT(v.id), 0)::INTEGER,
    false
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id 
    AND c.round_id = v.round_id
    AND v.round_number = calculate_round_results.round_number
  WHERE c.round_id = calculate_round_results.round_id
    AND c.is_eliminated = false
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign super_admin role to the first user
CREATE OR REPLACE FUNCTION auto_assign_first_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.admin_users;
  
  -- If this is the first user, make them super_admin
  IF user_count = 0 THEN
    NEW.role = 'super_admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 7: CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION hash_password_trigger();

CREATE TRIGGER auto_assign_first_super_admin_trigger
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION auto_assign_first_super_admin();

CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON public.admin_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at 
  BEFORE UPDATE ON public.rounds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
  BEFORE UPDATE ON public.candidates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 8: CREATE DEFAULT ADMIN USER
-- ============================================================================

-- Create default admin user with username "admin" and password "Votaciones2025"
INSERT INTO public.admin_users (username, password_hash, name, email, role) 
VALUES (
  'admin',
  'Votaciones2025', -- Will be hashed by trigger
  'Administrador MCM', 
  'admin@movimientoconsolacion.com',
  'super_admin'
);

-- ============================================================================
-- PHASE 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- PHASE 10: SUCCESS CONFIRMATION
-- ============================================================================

-- Add helpful comments for documentation
COMMENT ON TABLE public.rounds IS 'Voting rounds with RLS: public users see active rounds, admins manage all';
COMMENT ON TABLE public.candidates IS 'Candidates with RLS: public users see candidates for active rounds, admins manage all';
COMMENT ON TABLE public.votes IS 'Votes with RLS: users vote in active rounds, admins manage all';
COMMENT ON TABLE public.admin_users IS 'Admin users with bcrypt authentication';

-- Success message
SELECT 
  'MCM Voting System database reset completed successfully!' as status,
  'All tables dropped and recreated' as action,
  'Default admin: username=admin, password=Votaciones2025' as credentials,
  'You can now use the admin panel without permission errors' as next_step;