-- MCM Voting System - Simplified Authentication Setup
-- This script implements the simplified authentication system as described in SISTEMA_SIMPLIFICADO.md
-- Run this script to set up the new admin_users table and authentication functions

-- Create custom types if they don't exist
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

-- Create admin_users table for simplified authentication
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

-- Create function to hash passwords using bcrypt (using PostgreSQL's crypt function)
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

-- Create trigger to automatically hash passwords on insert and update
DROP TRIGGER IF EXISTS hash_password_trigger ON public.admin_users;
CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION hash_password_trigger();

-- Create function to authenticate admin users
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

-- Create function to automatically assign super_admin role to the first user
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

-- Create trigger to automatically assign super_admin role to first user
DROP TRIGGER IF EXISTS auto_assign_first_super_admin_trigger ON public.admin_users;
CREATE TRIGGER auto_assign_first_super_admin_trigger
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION auto_assign_first_super_admin();

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON public.admin_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users
-- Allow all admins to view all admin users
CREATE POLICY "Admins can view all admin users" ON public.admin_users
  FOR SELECT USING (true); -- We'll handle authorization in application logic

-- Allow inserts for user creation (first user creation)
CREATE POLICY "Allow admin user creation" ON public.admin_users
  FOR INSERT WITH CHECK (true); -- First user creation handled by trigger

-- Allow updates (password changes, etc) - handle in app logic
CREATE POLICY "Allow admin user updates" ON public.admin_users
  FOR UPDATE USING (true);

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
SELECT 'MCM Simplified Authentication System setup completed successfully!' as setup_status,
       'Username: admin, Password: Votaciones2025' as admin_credentials;