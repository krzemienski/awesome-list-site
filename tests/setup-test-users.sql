-- Setup Script for E2E Test Users
-- Run this SQL in your Supabase SQL Editor to create test users
-- https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new

-- Note: This assumes you have email confirmation disabled for testing
-- Go to: Authentication > Settings > Email Auth > Disable "Confirm email"

-- ===========================================
-- STEP 1: Create Test Users via Supabase Dashboard
-- ===========================================
-- You must create these users manually via:
-- Dashboard → Authentication → Users → Add User
--
-- Admin User:
--   Email: admin@test.com
--   Password: TestAdmin123!
--   Confirm Password: TestAdmin123!
--
-- Regular User:
--   Email: testuser@test.com
--   Password: TestUser123!
--   Confirm Password: TestUser123!

-- ===========================================
-- STEP 2: Promote Admin User (Run this SQL)
-- ===========================================

-- Set admin role for admin user
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@test.com';

-- Verify admin was set correctly
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE email IN ('admin@test.com', 'testuser@test.com')
ORDER BY email;

-- Expected output:
-- | id (uuid)        | email             | role  | created_at          |
-- |------------------|-------------------|-------|---------------------|
-- | [uuid]           | admin@test.com    | admin | [timestamp]         |
-- | [uuid]           | testuser@test.com | null  | [timestamp]         |

-- ===========================================
-- STEP 3: Verify Users Can Login
-- ===========================================

-- Check user authentication settings
SELECT
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  banned_until,
  deleted_at
FROM auth.users
WHERE email IN ('admin@test.com', 'testuser@test.com')
ORDER BY email;

-- Both users should have:
-- - email_confirmed_at: [timestamp] (or NULL if confirmation disabled)
-- - has_password: true
-- - banned_until: NULL
-- - deleted_at: NULL

-- ===========================================
-- STEP 4: Create User Preferences (Optional)
-- ===========================================

-- Create default preferences for test users
INSERT INTO user_preferences (user_id, skill_level, preferred_categories, learning_goals, time_commitment)
SELECT
  id,
  'intermediate',
  '["Encoding & Codecs", "Players & Clients"]'::jsonb,
  '["Learn video encoding", "Build streaming app"]'::jsonb,
  'weekly'
FROM auth.users
WHERE email IN ('admin@test.com', 'testuser@test.com')
ON CONFLICT (user_id) DO NOTHING;

-- Verify preferences created
SELECT
  up.id,
  u.email,
  up.skill_level,
  up.preferred_categories,
  up.time_commitment
FROM user_preferences up
JOIN auth.users u ON up.user_id = u.id
WHERE u.email IN ('admin@test.com', 'testuser@test.com')
ORDER BY u.email;

-- ===========================================
-- STEP 5: Verify RLS Policies
-- ===========================================

-- Check that RLS is enabled on key tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'resources',
    'user_favorites',
    'user_bookmarks',
    'user_preferences',
    'user_journey_progress'
  )
ORDER BY tablename;

-- All tables should have rls_enabled = true

-- Check admin bypass policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE '%admin%'
ORDER BY tablename, policyname;

-- ===========================================
-- STEP 6: Seed Test Data (Optional)
-- ===========================================

-- Create a few test resources for testing
INSERT INTO resources (title, url, description, category, subcategory, status, approved_by)
SELECT
  'E2E Test Resource ' || generate_series(1, 5),
  'https://github.com/test/resource-' || generate_series(1, 5),
  'This is a test resource for E2E testing. Can be safely deleted.',
  'Encoding & Codecs',
  'Codecs',
  'approved',
  (SELECT id FROM auth.users WHERE email = 'admin@test.com')
WHERE NOT EXISTS (
  SELECT 1 FROM resources WHERE title LIKE 'E2E Test Resource%'
);

-- Verify test resources created
SELECT
  id,
  title,
  status,
  category,
  created_at
FROM resources
WHERE title LIKE 'E2E Test Resource%'
ORDER BY title;

-- ===========================================
-- CLEANUP (Run this after tests complete)
-- ===========================================

-- Delete test resources
-- DELETE FROM resources WHERE title LIKE 'E2E Test Resource%' OR title LIKE 'Test Resource%';

-- Delete test user data
-- DELETE FROM user_favorites WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('admin@test.com', 'testuser@test.com'));
-- DELETE FROM user_bookmarks WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('admin@test.com', 'testuser@test.com'));
-- DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('admin@test.com', 'testuser@test.com'));

-- DO NOT DELETE TEST USERS - Keep them for future test runs
-- If you need to reset passwords, do it via Supabase Dashboard

-- ===========================================
-- TROUBLESHOOTING
-- ===========================================

-- If login fails, check:

-- 1. User exists and is active
SELECT
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  banned_until IS NULL as not_banned,
  deleted_at IS NULL as not_deleted
FROM auth.users
WHERE email IN ('admin@test.com', 'testuser@test.com');

-- 2. Email confirmation is disabled (for testing)
-- Go to: Dashboard → Settings → Authentication → Email Auth
-- Uncheck "Enable email confirmations"

-- 3. Password meets requirements
-- Minimum 8 characters
-- At least 1 uppercase letter
-- At least 1 number
-- At least 1 special character

-- 4. Check auth logs for errors
-- Go to: Dashboard → Logs → Auth
-- Filter by error level

-- ===========================================
-- SECURITY NOTES
-- ===========================================

-- IMPORTANT: These test users should ONLY exist in:
-- - Development/staging databases
-- - CI/CD test databases

-- NEVER create these users in production!

-- For production testing:
-- - Use separate test environment
-- - Use dynamic test user creation
-- - Cleanup test data after runs
-- - Never hardcode credentials

-- ===========================================

-- Done! Test users are ready for E2E testing.
-- Run your Playwright tests with: npm run test:e2e
