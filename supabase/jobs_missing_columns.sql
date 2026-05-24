-- Fix: add all columns that may be missing from the jobs table
-- Safe to run multiple times (IF NOT EXISTS)

-- From driver_vehicles_applications.sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS open_for_applications BOOLEAN DEFAULT false;

-- From job_routes.sql (re-run safe)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS route_legs JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hours_per_day NUMERIC(4,1);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS number_of_days INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_car_model TEXT;

-- From job_visibility.sql (re-run safe)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'company';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_driver_ids JSONB NOT NULL DEFAULT '[]';

ALTER TABLE freelancer_jobs ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all';
ALTER TABLE freelancer_jobs ADD COLUMN IF NOT EXISTS target_driver_ids JSONB NOT NULL DEFAULT '[]';

-- Reload PostgREST schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
