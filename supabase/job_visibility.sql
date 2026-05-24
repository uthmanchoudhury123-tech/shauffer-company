-- Job visibility + direct targeting
-- visibility: 'company' = company drivers only (default)
--             'platform' = all drivers incl. freelancers
--             'direct'   = only specific driver IDs

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS target_driver_ids JSONB NOT NULL DEFAULT '[]';

-- Freelancer jobs: 'all' = all freelancers, 'direct' = specific IDs
ALTER TABLE freelancer_jobs
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_driver_ids JSONB NOT NULL DEFAULT '[]';
