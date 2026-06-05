-- Allow drivers to post jobs (company_id is optional for freelancers)
-- Run in Supabase SQL Editor

-- 1. Make company_id nullable on jobs so freelance drivers can post
ALTER TABLE public.jobs ALTER COLUMN company_id DROP NOT NULL;

-- 2. Add posted_by_driver column so we know who (driver) posted it
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_by_driver_id uuid;

-- 3. RLS: allow drivers to insert their own jobs
DROP POLICY IF EXISTS "Drivers can post jobs" ON public.jobs;
CREATE POLICY "Drivers can post jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 4. RLS: allow drivers to view and manage jobs they posted
DROP POLICY IF EXISTS "Drivers can manage their posted jobs" ON public.jobs;
CREATE POLICY "Drivers can manage their posted jobs"
  ON public.jobs FOR ALL TO authenticated
  USING (created_by = auth.uid());

NOTIFY pgrst, 'reload schema';
