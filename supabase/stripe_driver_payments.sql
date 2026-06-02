-- Add payment tracking to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Ensure driver_wallets exists (may already exist for freelancers)
CREATE TABLE IF NOT EXISTS driver_wallets (
  driver_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_own" ON driver_wallets;
CREATE POLICY "wallet_own" ON driver_wallets
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

-- Ensure wallet_transactions exists
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

-- Ensure stripe_accounts exists
CREATE TABLE IF NOT EXISTS stripe_accounts (
  driver_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connect_id  TEXT,
  connect_onboarded  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_accounts_own" ON stripe_accounts;
CREATE POLICY "stripe_accounts_own" ON stripe_accounts
  FOR ALL USING ((SELECT auth.uid()) = driver_id);

NOTIFY pgrst, 'reload schema';
