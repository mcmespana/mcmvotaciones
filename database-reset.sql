-- MCM Voting System - Database Reset Script
-- ⚠️  WARNING: This script will DELETE ALL DATA in the voting system tables
-- Only run this script when you want to completely reset the database
--
-- Usage:
-- 1. Go to your Supabase project SQL Editor
-- 2. Copy and paste this entire script
-- 3. Execute it to reset all tables and data
--
-- This script will:
-- 1. Drop all existing tables, indexes, triggers, and functions
-- 2. Clean up RLS policies  
-- 3. Remove custom types
-- 4. Recreate everything from scratch

-- ========================================
-- STEP 1: DROP EXISTING OBJECTS
-- ========================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_vote_results(UUID);

-- Drop tables (order matters due to foreign key constraints)
DROP TABLE IF EXISTS public.vote_history CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.rounds CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;

-- ========================================
-- STEP 2: RECREATE SCHEMA
-- ========================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'super_admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
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
  team TEXT NOT NULL,
  expected_voters INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(round_id, device_hash)
);

-- Vote history table for exports
CREATE TABLE public.vote_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  total_votes INTEGER NOT NULL,
  results JSONB NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  exported_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- STEP 3: CREATE INDEXES
-- ========================================

CREATE INDEX idx_rounds_active ON public.rounds(is_active, is_closed);
CREATE INDEX idx_candidates_round ON public.candidates(round_id, order_index);
CREATE INDEX idx_votes_round ON public.votes(round_id);
CREATE INDEX idx_votes_device ON public.votes(device_hash);
CREATE INDEX idx_votes_candidate ON public.votes(candidate_id);

-- ========================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 5: CREATE RLS POLICIES
-- ========================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
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

-- Vote history policies
CREATE POLICY "Admins can manage vote history" ON public.vote_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- STEP 6: CREATE FUNCTIONS
-- ========================================

-- Function to get vote results for a round
CREATE OR REPLACE FUNCTION get_vote_results(round_id UUID)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(v.id)
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id
  WHERE c.round_id = get_vote_results.round_id
  GROUP BY c.id, c.name, c.order_index
  ORDER BY c.order_index;
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

-- ========================================
-- STEP 7: CREATE TRIGGERS
-- ========================================

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at 
  BEFORE UPDATE ON public.rounds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
  BEFORE UPDATE ON public.candidates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RESET COMPLETE
-- ========================================

-- Success message
SELECT 'MCM Voting System database reset completed successfully!' as message;

-- Next steps:
-- 1. Create your first admin user by registering through the app (/admin)
-- 2. Or manually create with: 
--    INSERT INTO public.users (id, email, name, role) 
--    VALUES (auth.uid(), 'your-email@example.com', 'Your Name', 'super_admin');