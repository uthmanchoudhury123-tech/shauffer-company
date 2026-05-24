-- Fix: infinite recursion in user_profiles RLS policy
-- The issue: policies that call auth.uid() inside a subquery on the same table
-- cause Postgres to recurse infinitely. Wrapping in (SELECT auth.uid()) breaks the loop.

-- Drop and recreate all user_profiles policies with the non-recursive form

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users" ON user_profiles;

-- Recreate with (SELECT auth.uid()) — the parentheses force a one-time evaluation
-- and prevent the recursive policy re-check that causes the infinite loop

CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Also fix jobs policies if they reference user_profiles in a subquery
-- Drop and recreate the common jobs policies

DROP POLICY IF EXISTS "Company admins can manage jobs" ON jobs;
DROP POLICY IF EXISTS "Drivers can view assigned jobs" ON jobs;
DROP POLICY IF EXISTS "jobs_company_admin_all" ON jobs;
DROP POLICY IF EXISTS "jobs_driver_select" ON jobs;
DROP POLICY IF EXISTS "Enable insert for company admins" ON jobs;
DROP POLICY IF EXISTS "Enable select for drivers" ON jobs;

CREATE POLICY "jobs_company_admin_all" ON jobs
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "jobs_driver_select" ON jobs
  FOR SELECT USING (
    driver_id = (SELECT auth.uid())
    OR open_for_applications = true
    OR (SELECT auth.uid()) IN (
      SELECT id FROM user_profiles
      WHERE company_id = jobs.company_id
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
