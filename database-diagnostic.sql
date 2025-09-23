-- MCM Votaciones - Diagnostic Script
-- Run this script to diagnose permissions and database state issues
-- Copy the output to help debug your setup

-- ============================================================================
-- DIAGNOSTIC INFORMATION FOR MCM VOTACIONES
-- ============================================================================

SELECT '=== MCM VOTACIONES DIAGNOSTIC REPORT ===' as info;
SELECT 'Generated: ' || now() as timestamp;

-- Check database connection and current user
SELECT '--- CONNECTION INFO ---' as section;
SELECT 'Current User: ' || current_user as current_user;
SELECT 'Session User: ' || session_user as session_user;
SELECT 'Current Database: ' || current_database() as current_database;

-- Check if required tables exist
SELECT '--- TABLES STATUS ---' as section;
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ All required tables exist'
    ELSE '❌ Missing tables: ' || (5 - COUNT(*))::text || ' of 5'
  END as tables_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_users', 'rounds', 'candidates', 'votes', 'round_results');

-- List existing tables
SELECT 'Existing tables:' as info;
SELECT '  - ' || table_name as table_list
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS status
SELECT '--- ROW LEVEL SECURITY STATUS ---' as section;
SELECT 
  t.table_name,
  CASE 
    WHEN t.row_security = 'YES' THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
AND t.table_name IN ('admin_users', 'rounds', 'candidates', 'votes', 'round_results')
ORDER BY t.table_name;

-- Check policies count
SELECT '--- RLS POLICIES COUNT ---' as section;
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has policies'
    ELSE '❌ No policies'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('admin_users', 'rounds', 'candidates', 'votes', 'round_results')
GROUP BY tablename
ORDER BY tablename;

-- List all policies
SELECT '--- ALL RLS POLICIES ---' as section;
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has conditions'
    ELSE 'No conditions (allows all)'
  END as conditions
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check admin users
SELECT '--- ADMIN USERS ---' as section;
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Admin users exist: ' || COUNT(*)::text
    ELSE '❌ No admin users found'
  END as admin_status
FROM public.admin_users;

-- Show admin users (without passwords)
SELECT 'Admin users list:' as info;
SELECT 
  '  - ' || username || ' (' || role || ')' as admin_list
FROM public.admin_users 
ORDER BY created_at;

-- Check for common issues
SELECT '--- COMMON ISSUES CHECK ---' as section;

-- Check if there are conflicting policies
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️  Found old/conflicting policies that may cause issues'
    ELSE '✅ No conflicting policies detected'
  END as conflicting_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
  policyname LIKE '%Anyone can view%' OR
  policyname LIKE '%Allow round management%' OR
  policyname LIKE '%fix%' OR
  policyname LIKE '%old%'
);

-- Check if functions exist
SELECT '--- FUNCTIONS STATUS ---' as section;
SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Required functions exist'
    ELSE '⚠️  Some functions may be missing'
  END as functions_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('authenticate_admin', 'hash_password_trigger', 'calculate_round_results');

-- Summary and recommendations
SELECT '--- SUMMARY AND RECOMMENDATIONS ---' as section;
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('admin_users', 'rounds', 'candidates', 'votes', 'round_results')
    ) = 5
    AND (
      SELECT COUNT(*) FROM public.admin_users
    ) > 0
    AND (
      SELECT COUNT(*) FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'rounds'
    ) > 0
    THEN '✅ Database appears to be correctly configured'
    ELSE '❌ Issues detected - see details above'
  END as overall_status;

SELECT 'Next steps:' as info;
SELECT '1. If you see ❌ issues above, run reset-database.sql' as step1;
SELECT '2. If RLS is disabled, enable it for each table' as step2;
SELECT '3. If no admin users exist, create one manually' as step3;
SELECT '4. If policies are missing, run the complete setup script' as step4;

SELECT '=== END OF DIAGNOSTIC REPORT ===' as info;