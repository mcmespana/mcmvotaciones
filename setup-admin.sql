-- MCM Voting System - Admin User Setup Script
-- Run this script AFTER creating the admin user in Supabase Auth UI
-- Email: admin@movimientoconsolacion.com
-- Password: Votaciones2025

-- First, manually create the user in Supabase Auth UI with the above credentials
-- Then run this script to set up the user profile

-- Insert the admin user profile
INSERT INTO public.users (id, email, name, role) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@movimientoconsolacion.com'),
  'admin@movimientoconsolacion.com', 
  'Administrador MCM', 
  'super_admin'
)
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  name = 'Administrador MCM';

-- Verify the admin user was created
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at
FROM public.users u
WHERE u.email = 'admin@movimientoconsolacion.com';