-- ============================================================
-- [PLATFORM] — Full Supabase Schema
-- Designed to scale to 150 companies and 1,000+ drivers
-- Run this in your Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('company_admin', 'company_driver', 'freelance_driver');
CREATE TYPE vehicle_status AS ENUM ('available', 'on_job', 'off_road');
CREATE TYPE car_type AS ENUM ('saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van');
CREATE TYPE availability_status AS ENUM ('available', 'on_job', 'offline');
CREATE TYPE driver_category AS ENUM ('company', 'freelance');
CREATE TYPE job_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'enterprise');

-- ============================================================
-- COMPANIES
-- Multi-tenant root table — every piece of data links back here
-- ============================================================

CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  logo_url      TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'starter',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES
-- Extends Supabase auth.users with role and company linkage
-- ============================================================

CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          user_role NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,  -- NULL for freelance drivers
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VEHICLES / FLEET
-- ============================================================

CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            SMALLINT NOT NULL,
  registration    TEXT NOT NULL,
  car_type        car_type NOT NULL,
  status          vehicle_status NOT NULL DEFAULT 'available',
  colour          TEXT,
  -- Compliance dates (alerts trigger at 30 days)
  mot_date        DATE,
  service_date    DATE,
  road_tax_date   DATE,
  insurance_date  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, registration)
);

-- ============================================================
-- DRIVER PROFILES
-- ============================================================

CREATE TABLE drivers (
  id                  UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,  -- NULL for freelance
  full_name           TEXT NOT NULL,
  photo_url           TEXT,
  car_type            car_type NOT NULL DEFAULT 'saloon',
  licence_number      TEXT,
  licence_expiry      DATE,
  availability_status availability_status NOT NULL DEFAULT 'offline',
  driver_category     driver_category NOT NULL DEFAULT 'company',
  is_verified         BOOLEAN NOT NULL DEFAULT false,
  rating              NUMERIC(3, 2) NOT NULL DEFAULT 0.0,  -- 0.00 – 5.00
  rating_count        INTEGER NOT NULL DEFAULT 0,
  -- Live GPS location (updated from driver app/updates)
  current_lat         DOUBLE PRECISION,
  current_lng         DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOBS
-- ============================================================

CREATE TABLE jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Locations
  pickup_address      TEXT NOT NULL,
  pickup_lat          DOUBLE PRECISION,
  pickup_lng          DOUBLE PRECISION,
  dropoff_address     TEXT NOT NULL,
  dropoff_lat         DOUBLE PRECISION,
  dropoff_lng         DOUBLE PRECISION,
  -- Schedule
  job_date            DATE NOT NULL,
  job_time            TIME NOT NULL,
  -- Details
  price               NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  preferred_car_type  car_type,
  notes               TEXT,
  -- Status
  status              job_status NOT NULL DEFAULT 'pending',
  driver_id           UUID REFERENCES drivers(id) ON DELETE SET NULL,
  -- Audit
  created_by          UUID NOT NULL REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- Keeps updated_at in sync automatically
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'company_driver'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES (for scalability)
-- ============================================================

-- Multi-tenant queries always filter by company_id
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);

-- Common filtered lookups
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_availability ON drivers(availability_status);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_driver_id ON jobs(driver_id);
CREATE INDEX idx_jobs_date ON jobs(job_date);

-- Compliance date lookups (for alert queries)
CREATE INDEX idx_vehicles_mot_date ON vehicles(mot_date);
CREATE INDEX idx_vehicles_insurance_date ON vehicles(insurance_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down. Users can only see their own
-- company's data. Freelance drivers see only assigned jobs.
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- ---- Helper function: get the current user's company_id ----

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ---- Helper function: get the current user's role ----

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- COMPANIES RLS
-- ============================================================

-- Admins can read and update their own company
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    id = get_my_company_id()
  );

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (
    id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- ============================================================
-- USER PROFILES RLS
-- ============================================================

-- Users can read their own profile
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles in their company
CREATE POLICY "user_profiles_select_company" ON user_profiles
  FOR SELECT USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- VEHICLES RLS
-- ============================================================

-- Admins and company drivers can view vehicles in their company
CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT USING (company_id = get_my_company_id());

-- Only admins can insert/update/delete vehicles
CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- ============================================================
-- DRIVERS RLS
-- ============================================================

-- Admins see all drivers in their company
CREATE POLICY "drivers_select_admin" ON drivers
  FOR SELECT USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Drivers can see their own record
CREATE POLICY "drivers_select_own" ON drivers
  FOR SELECT USING (id = auth.uid());

-- Drivers can update their own record (e.g. availability, location)
CREATE POLICY "drivers_update_own" ON drivers
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any driver in their company
CREATE POLICY "drivers_update_admin" ON drivers
  FOR UPDATE USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Admins can insert drivers into their company
CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- ============================================================
-- JOBS RLS
-- ============================================================

-- Admins see all jobs for their company
CREATE POLICY "jobs_select_admin" ON jobs
  FOR SELECT USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Drivers ONLY see jobs assigned to them (privacy by default)
CREATE POLICY "jobs_select_driver" ON jobs
  FOR SELECT USING (
    driver_id = auth.uid()
    AND get_my_role() IN ('company_driver', 'freelance_driver')
  );

-- Only admins can create jobs
CREATE POLICY "jobs_insert" ON jobs
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Only admins can update jobs (e.g. assign driver, change status)
CREATE POLICY "jobs_update_admin" ON jobs
  FOR UPDATE USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- Drivers can update their assigned job status (in_progress → completed)
CREATE POLICY "jobs_update_driver" ON jobs
  FOR UPDATE USING (
    driver_id = auth.uid()
    AND get_my_role() IN ('company_driver', 'freelance_driver')
  );

-- Only admins can delete jobs
CREATE POLICY "jobs_delete" ON jobs
  FOR DELETE USING (
    company_id = get_my_company_id() AND get_my_role() = 'company_admin'
  );

-- ============================================================
-- COMPLIANCE ALERTS VIEW
-- Pre-built view for querying vehicles with expiring documents
-- within the next 30 days
-- ============================================================

CREATE OR REPLACE VIEW compliance_alerts AS
SELECT
  v.id AS vehicle_id,
  v.company_id,
  v.registration,
  v.make,
  v.model,
  'mot' AS alert_type,
  v.mot_date AS due_date,
  (v.mot_date - CURRENT_DATE) AS days_until_due
FROM vehicles v
WHERE v.mot_date IS NOT NULL
  AND (v.mot_date - CURRENT_DATE) <= 30

UNION ALL

SELECT
  v.id,
  v.company_id,
  v.registration,
  v.make,
  v.model,
  'service',
  v.service_date,
  (v.service_date - CURRENT_DATE)
FROM vehicles v
WHERE v.service_date IS NOT NULL
  AND (v.service_date - CURRENT_DATE) <= 30

UNION ALL

SELECT
  v.id,
  v.company_id,
  v.registration,
  v.make,
  v.model,
  'road_tax',
  v.road_tax_date,
  (v.road_tax_date - CURRENT_DATE)
FROM vehicles v
WHERE v.road_tax_date IS NOT NULL
  AND (v.road_tax_date - CURRENT_DATE) <= 30

UNION ALL

SELECT
  v.id,
  v.company_id,
  v.registration,
  v.make,
  v.model,
  'insurance',
  v.insurance_date,
  (v.insurance_date - CURRENT_DATE)
FROM vehicles v
WHERE v.insurance_date IS NOT NULL
  AND (v.insurance_date - CURRENT_DATE) <= 30

ORDER BY days_until_due ASC;
