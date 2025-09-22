-- MCM Voting System - Complete Database Setup with Simplified Authentication
-- Run this script to set up the complete database schema with simplified admin authentication
-- 
-- This includes:
-- - Simplified admin_users table with bcrypt password hashing
-- - Direct username/password authentication (no Supabase Auth dependency)
-- - Default admin user: username="admin", password="Votaciones2025"

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_type AS ENUM ('ECE', 'ECL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Admin users table for simplified authentication (replaces old users table)
CREATE TABLE IF NOT EXISTS public.admin_users (
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
CREATE TABLE IF NOT EXISTS public.rounds (
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
CREATE TABLE IF NOT EXISTS public.candidates (
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
CREATE TABLE IF NOT EXISTS public.votes (
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
CREATE TABLE IF NOT EXISTS public.round_results (
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
CREATE TABLE IF NOT EXISTS public.vote_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  total_votes INTEGER NOT NULL,
  results JSONB NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  exported_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rounds_active ON public.rounds(is_active, is_closed);
CREATE INDEX IF NOT EXISTS idx_candidates_round ON public.candidates(round_id, order_index);
CREATE INDEX IF NOT EXISTS idx_candidates_eliminated ON public.candidates(round_id, is_eliminated, is_selected);
CREATE INDEX IF NOT EXISTS idx_votes_round ON public.votes(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_device ON public.votes(device_hash);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON public.votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_round_number ON public.votes(round_id, round_number);
CREATE INDEX IF NOT EXISTS idx_round_results ON public.round_results(round_id, round_number);

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history ENABLE ROW LEVEL SECURITY;

-- Admin users policies (simplified - authorization handled in app logic)
CREATE POLICY "Admins can view all admin users" ON public.admin_users
  FOR SELECT USING (true);

CREATE POLICY "Allow admin user creation" ON public.admin_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin user updates" ON public.admin_users
  FOR UPDATE USING (true);

-- Rounds policies (simplified - removed auth.uid() dependencies)
CREATE POLICY "Anyone can view active rounds" ON public.rounds
  FOR SELECT USING (is_active = true AND is_closed = false);

CREATE POLICY "Allow round management" ON public.rounds
  FOR ALL USING (true); -- Authorization handled in application logic

-- Candidates policies (simplified)
CREATE POLICY "Anyone can view candidates for active rounds" ON public.candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Allow candidate management" ON public.candidates
  FOR ALL USING (true); -- Authorization handled in application logic

-- Votes policies
CREATE POLICY "Anyone can insert votes" ON public.votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Allow vote viewing" ON public.votes
  FOR SELECT USING (true); -- Authorization handled in application logic

-- Round results policies
CREATE POLICY "Anyone can view visible round results" ON public.round_results
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Allow round results management" ON public.round_results
  FOR ALL USING (true); -- Authorization handled in application logic

-- Vote history policies
CREATE POLICY "Allow vote history management" ON public.vote_history
  FOR ALL USING (true); -- Authorization handled in application logic

-- Functions

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

-- Triggers for updated_at and password hashing
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

-- Create default admin user with username "admin" and password "Votaciones2025"
DO $$
BEGIN
  -- Check if admin user already exists
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE username = 'admin') THEN
    INSERT INTO public.admin_users (username, password_hash, name, email, role) 
    VALUES (
      'admin',
      'Votaciones2025', -- Will be hashed by trigger
      'Administrador MCM', 
      'admin@movimientoconsolacion.com',
      'super_admin'
    );
    RAISE NOTICE 'Default admin user created successfully with username: admin';
  ELSE
    RAISE NOTICE 'Admin user already exists, skipping creation';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_admin TO anon, authenticated;

-- Success message
SELECT 'MCM Voting System database setup completed successfully!' as setup_status,
       'Default admin: username=admin, password=Votaciones2025' as admin_credentials;