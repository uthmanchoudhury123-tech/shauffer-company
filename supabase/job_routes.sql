-- Enhanced job fields: route legs, end time, daily jobs, preferred car model
-- Run this in the Supabase SQL editor

-- Route legs: ordered array of addresses (each consecutive pair = one leg)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS route_legs JSONB;

-- End time for jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS end_time TIME;

-- Job type: 'standard' (point-to-point) or 'daily' (hourly/daily hire)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) DEFAULT 'standard';

-- Daily job fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hours_per_day NUMERIC(4,1);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS number_of_days INTEGER;

-- Free-text preferred car model (e.g. "Mercedes S Class", "BMW 7 Series")
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_car_model TEXT;

-- Notes field on vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
