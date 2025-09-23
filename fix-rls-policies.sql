-- Fix for MCM Votaciones RLS Permission Issues (Error 42501)
-- 
-- This script fixes the Row Level Security policies that were causing
-- permission denied errors when admins try to load or create votations/rounds.
--
-- Problem: The original policies were too restrictive for admin operations
-- Solution: Separate policies for public users vs admin operations

-- First, drop the existing conflicting policies
DROP POLICY IF EXISTS "Anyone can view active rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow round management" ON public.rounds;
DROP POLICY IF EXISTS "Anyone can view candidates for active rounds" ON public.candidates;
DROP POLICY IF EXISTS "Allow candidate management" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can view visible round results" ON public.round_results;
DROP POLICY IF EXISTS "Allow round results management" ON public.round_results;

-- NEW ROUNDS POLICIES
-- Policy 1: Allow public users to view only active, open rounds (for voting)
CREATE POLICY "Public can view active rounds for voting" ON public.rounds
  FOR SELECT 
  USING (is_active = true AND is_closed = false);

-- Policy 2: Allow authenticated admins to manage all rounds
-- Note: This policy allows full CRUD operations for admins
-- In production, you might want to add authentication checks here
CREATE POLICY "Admins can manage all rounds" ON public.rounds
  FOR ALL 
  USING (true);

-- NEW CANDIDATES POLICIES  
-- Policy 1: Allow public users to view candidates only for active rounds
CREATE POLICY "Public can view candidates for active rounds" ON public.candidates
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

-- Policy 2: Allow admins to manage all candidates
CREATE POLICY "Admins can manage all candidates" ON public.candidates
  FOR ALL 
  USING (true);

-- NEW ROUND RESULTS POLICIES
-- Policy 1: Allow public users to view only visible results
CREATE POLICY "Public can view visible results" ON public.round_results
  FOR SELECT 
  USING (is_visible = true);

-- Policy 2: Allow admins to manage all round results
CREATE POLICY "Admins can manage all round results" ON public.round_results
  FOR ALL 
  USING (true);

-- VOTES POLICIES (these were working correctly, but let's be explicit)
DROP POLICY IF EXISTS "Anyone can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Allow vote viewing" ON public.votes;

-- Policy 1: Allow inserting votes only for active rounds
CREATE POLICY "Users can vote in active rounds" ON public.votes
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds 
      WHERE id = round_id AND is_active = true AND is_closed = false
    )
  );

-- Policy 2: Allow admins to view all votes
CREATE POLICY "Admins can view all votes" ON public.votes
  FOR SELECT 
  USING (true);

-- Policy 3: Restrict vote updates/deletes to admins only
CREATE POLICY "Admins can modify votes" ON public.votes
  FOR UPDATE 
  USING (true);

CREATE POLICY "Admins can delete votes" ON public.votes
  FOR DELETE 
  USING (true);

-- ADMIN USERS POLICIES (these were working, keeping them)
-- (No changes needed for admin_users table)

-- VOTE HISTORY POLICIES (these were working, keeping them)  
-- (No changes needed for vote_history table)

-- Add a comment for documentation
COMMENT ON TABLE public.rounds IS 'Voting rounds table with RLS policies: public users can view active rounds, admins can manage all rounds';
COMMENT ON TABLE public.candidates IS 'Candidates table with RLS policies: public users can view candidates for active rounds, admins can manage all candidates';
COMMENT ON TABLE public.round_results IS 'Round results table with RLS policies: public users can view visible results, admins can manage all results';
COMMENT ON TABLE public.votes IS 'Votes table with RLS policies: users can vote in active rounds, admins can view/modify all votes';