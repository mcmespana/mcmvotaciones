-- Add missing INSERT policy for users table
-- This allows new users to be created during registration

CREATE POLICY "Allow user registration" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);