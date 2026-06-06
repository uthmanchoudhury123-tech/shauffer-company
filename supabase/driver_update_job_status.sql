-- Allow assigned drivers to update their own job status
-- (e.g. start job, mark complete/awaiting_confirmation)
-- Previously only created_by = auth.uid() was covered; this adds driver_id = auth.uid()

DROP POLICY IF EXISTS "Assigned drivers can update job status" ON public.jobs;

CREATE POLICY "Assigned drivers can update job status"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Also ensure assigned drivers can read jobs assigned to them
DROP POLICY IF EXISTS "Assigned drivers can read their jobs" ON public.jobs;

CREATE POLICY "Assigned drivers can read their jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

NOTIFY pgrst, 'reload schema';
