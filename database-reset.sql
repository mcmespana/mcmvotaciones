-- MCM Voting System - Database Reset Script
-- ⚠️ WARNING: This script will DELETE ALL DATA from the database
-- Use this script only in development or when you need to completely reset the system

-- Disable RLS temporarily to allow dropping
ALTER TABLE IF EXISTS public.vote_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Admins can manage vote history" ON public.vote_history;
DROP POLICY IF EXISTS "Admins can view votes" ON public.votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can view candidates for active rounds" ON public.candidates;
DROP POLICY IF EXISTS "Admins can manage rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone can view active rounds" ON public.rounds;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow user registration" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Drop triggers
DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;
DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_vote_results(UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_votes_candidate;
DROP INDEX IF EXISTS idx_votes_device;
DROP INDEX IF EXISTS idx_votes_round;
DROP INDEX IF EXISTS idx_candidates_round;
DROP INDEX IF EXISTS idx_rounds_active;

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS public.vote_history CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.rounds CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role;

-- Remove all auth users (if you want to completely reset authentication)
-- ⚠️ Uncomment the following line ONLY if you want to delete all authentication users
-- DELETE FROM auth.users;

NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database reset completed successfully. All tables, policies, and data have been removed.' as result;