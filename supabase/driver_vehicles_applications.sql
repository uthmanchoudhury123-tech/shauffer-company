-- ============================================================
-- Company Driver Vehicles + Job Applications
-- ============================================================

-- Company driver vehicles (separate from freelancer driver_vehicles)
CREATE TABLE IF NOT EXISTS company_driver_vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid REFERENCES drivers(id) ON DELETE CASCADE,
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  make          text NOT NULL,
  model         text NOT NULL,
  year          integer,
  registration  text NOT NULL,
  color         text,
  car_type      text NOT NULL,  -- saloon, estate, suv, mpv, minibus, executive, van
  photo_url     text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE company_driver_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own vehicles"
  ON company_driver_vehicles FOR ALL
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view company vehicles"
  ON company_driver_vehicles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Job applications (company driver applies for an open job)
CREATE TABLE IF NOT EXISTS job_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid REFERENCES jobs(id) ON DELETE CASCADE,
  driver_id   uuid REFERENCES drivers(id) ON DELETE CASCADE,
  company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,
  status      text DEFAULT 'pending', -- pending | accepted | rejected
  message     text,
  vehicle_id  uuid REFERENCES company_driver_vehicles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(job_id, driver_id)
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own applications"
  ON job_applications FOR ALL
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage company job applications"
  ON job_applications FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add open_for_applications flag to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS open_for_applications boolean DEFAULT false;
