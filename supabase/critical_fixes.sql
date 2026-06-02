-- ── Critical migrations ───────────────────────────────────────────────────────

-- 1. Driver licence columns (TFL + Hertz)
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS tfl_licence_number   TEXT,
  ADD COLUMN IF NOT EXISTS tfl_licence_expiry   DATE,
  ADD COLUMN IF NOT EXISTS tfl_licence_photo    TEXT,
  ADD COLUMN IF NOT EXISTS hertz_licence_number TEXT,
  ADD COLUMN IF NOT EXISTS hertz_licence_expiry DATE,
  ADD COLUMN IF NOT EXISTS hertz_licence_photo  TEXT,
  ADD COLUMN IF NOT EXISTS dvla_licence_photo   TEXT,
  ADD COLUMN IF NOT EXISTS is_verified          BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Manual earnings table
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

-- 3. Job columns (price_type, payment_status, allow_counter_offer)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS price_type           TEXT DEFAULT 'fixed'
    CHECK (price_type IN ('fixed', 'per_hour', 'per_day')),
  ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS allow_counter_offer  BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Driver wallets
CREATE TABLE IF NOT EXISTS driver_wallets (
  driver_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_own" ON driver_wallets;
CREATE POLICY "wallet_own" ON driver_wallets
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

-- 5. Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  type        TEXT NOT NULL DEFAULT 'payment_received',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_tx_own" ON wallet_transactions;
CREATE POLICY "wallet_tx_own" ON wallet_transactions
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

-- 6. Stripe accounts
CREATE TABLE IF NOT EXISTS stripe_accounts (
  driver_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connect_id TEXT,
  connect_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_accounts_own" ON stripe_accounts;
CREATE POLICY "stripe_accounts_own" ON stripe_accounts
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

-- 7. Preferred drivers
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

-- 8. Job reviews
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

NOTIFY pgrst, 'reload schema';
