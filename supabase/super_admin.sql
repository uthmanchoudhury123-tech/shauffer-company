-- Super Admin setup
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Add super_admin to the user_role enum
alter type user_role add value if not exists 'super_admin';

-- 2. Add is_suspended column to companies
alter table public.companies
  add column if not exists is_suspended boolean not null default false;

-- 3. Super admins can read ALL companies (bypass company_id filter)
create policy "super_admin read all companies"
  on public.companies
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 4. Super admins can update companies (suspend/activate)
create policy "super_admin update companies"
  on public.companies
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 5. Super admins can read ALL user_profiles
create policy "super_admin read all profiles"
  on public.user_profiles
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 6. Super admins can read ALL drivers
create policy "super_admin read all drivers"
  on public.drivers
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 7. Super admins can read ALL jobs
create policy "super_admin read all jobs"
  on public.jobs
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );
