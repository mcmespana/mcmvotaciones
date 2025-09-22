-- MCM Voting System - Complete Database Setup with Default Admin
-- Run this script to set up the complete database schema and default admin user
-- 
-- IMPORTANT: You must first create the admin user in Supabase Auth UI:
-- Email: admin@movimientoconsolacion.com
-- Password: Votaciones2025
-- Then run this script to complete the setup

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'super_admin');
CREATE TYPE team_type AS ENUM ('ECE', 'ECL');

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
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
  exported_by UUID REFERENCES public.users(id),
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
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow user registration" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Super admins can create and manage other admin users
CREATE POLICY "Super admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Rounds policies
CREATE POLICY "Anyone can view active rounds" ON public.rounds
  FOR SELECT USING (is_active = true AND is_closed = false);

CREATE POLICY "Admins can manage rounds" ON public.rounds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Candidates policies  
CREATE POLICY "Anyone can view candidates for active rounds" ON public.candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Admins can manage candidates" ON public.candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Votes policies
CREATE POLICY "Anyone can insert votes" ON public.votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

CREATE POLICY "Admins can view votes" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Round results policies
CREATE POLICY "Anyone can view visible round results" ON public.round_results
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Admins can manage round results" ON public.round_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Vote history policies
CREATE POLICY "Admins can manage vote history" ON public.vote_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Functions

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

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at 
  BEFORE UPDATE ON public.rounds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
  BEFORE UPDATE ON public.candidates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically assign super_admin role to the first user
CREATE OR REPLACE FUNCTION auto_assign_first_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- If this is the first user, make them super_admin
  IF user_count = 0 THEN
    NEW.role = 'super_admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically assign super_admin role to first user
CREATE TRIGGER auto_assign_first_super_admin_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION auto_assign_first_super_admin();

-- Insert the default admin user (run this AFTER creating auth user)
-- This requires the admin user to be created first in Supabase Auth with:
-- Email: admin@movimientoconsolacion.com
-- Password: Votaciones2025

DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- Get the auth user ID for the admin email
  SELECT id INTO admin_auth_id 
  FROM auth.users 
  WHERE email = 'admin@movimientoconsolacion.com';
  
  -- Only insert if the auth user exists
  IF admin_auth_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, role) 
    VALUES (
      admin_auth_id,
      'admin@movimientoconsolacion.com', 
      'Administrador MCM', 
      'super_admin'
    )
    ON CONFLICT (email) DO UPDATE SET 
      role = 'super_admin',
      name = 'Administrador MCM';
      
    RAISE NOTICE 'Admin user setup completed successfully';
  ELSE
    RAISE NOTICE 'Admin auth user not found. Please create the auth user first with email: admin@movimientoconsolacion.com';
  END IF;
END $$;

-- Success message
SELECT 'MCM Voting System database setup completed successfully!' as setup_status;