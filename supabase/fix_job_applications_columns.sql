-- Fix job_applications table: add all potentially missing columns
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS driver_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message         TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS counter_price   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS counter_note    TEXT,
  ADD COLUMN IF NOT EXISTS driver_name     TEXT,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS job_applications_driver_idx  ON job_applications(driver_id);
CREATE INDEX IF NOT EXISTS job_applications_job_idx     ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS job_applications_company_idx ON job_applications(company_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
