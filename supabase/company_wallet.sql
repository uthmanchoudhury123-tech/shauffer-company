-- Company wallet for admin to hold funds and pay drivers

CREATE TABLE IF NOT EXISTS company_wallets (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  balance     NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('topup', 'payment')),
  description TEXT,
  job_id      UUID REFERENCES jobs(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE company_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_wallet_select" ON company_wallets
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "company_wallet_tx_select" ON company_wallet_transactions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );
