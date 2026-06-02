-- ── Preferred freelance drivers ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preferred_drivers (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, driver_id)
);

ALTER TABLE preferred_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preferred_drivers_company" ON preferred_drivers;
CREATE POLICY "preferred_drivers_company" ON preferred_drivers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

-- ── Job reviews ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  driver_id   UUID NOT NULL REFERENCES auth.users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, reviewer_id)
);

ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select" ON job_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON job_reviews;
CREATE POLICY "reviews_select" ON job_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON job_reviews FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = reviewer_id);

-- Ensure drivers table has is_verified column
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
