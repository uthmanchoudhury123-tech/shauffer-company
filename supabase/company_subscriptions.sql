-- Company subscription fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at     TIMESTAMPTZ;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS companies_stripe_customer_id_idx ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS companies_stripe_subscription_id_idx ON companies(stripe_subscription_id);

-- subscription_status values:
--   'trialing'   — within 90-day free trial
--   'active'     — paid subscription active
--   'past_due'   — payment failed, grace period
--   'canceled'   — subscription canceled
--   'expired'    — trial ended and no subscription started
