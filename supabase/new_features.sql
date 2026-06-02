-- ── Driver licence columns (TFL + Hertz) ─────────────────────────────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS tfl_licence_number  TEXT,
  ADD COLUMN IF NOT EXISTS tfl_licence_expiry  DATE,
  ADD COLUMN IF NOT EXISTS tfl_licence_photo   TEXT,
  ADD COLUMN IF NOT EXISTS hertz_licence_number TEXT,
  ADD COLUMN IF NOT EXISTS hertz_licence_expiry DATE,
  ADD COLUMN IF NOT EXISTS hertz_licence_photo  TEXT,
  ADD COLUMN IF NOT EXISTS dvla_licence_photo   TEXT;

-- ── Manual earnings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manual_earnings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT,
  source      TEXT NOT NULL DEFAULT 'cash' CHECK (source IN ('cash', 'bank_transfer', 'other')),
  job_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE manual_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_earnings_own" ON manual_earnings;
CREATE POLICY "manual_earnings_own" ON manual_earnings
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

-- ── Price type on jobs ────────────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed'
    CHECK (price_type IN ('fixed', 'per_hour', 'per_day'));

NOTIFY pgrst, 'reload schema';
