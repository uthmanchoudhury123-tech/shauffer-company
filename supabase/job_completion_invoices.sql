-- ── Job completion flow + client details + invoices ──────────────────────────

-- 1. Add awaiting_confirmation status and client fields to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_name  TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Update status check to include awaiting_confirmation
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending','assigned','in_progress','awaiting_confirmation','completed','cancelled'));

-- 2. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name    TEXT,
  client_email   TEXT,
  client_phone   TEXT,
  line_items     JSONB NOT NULL DEFAULT '[]',
  subtotal       NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  vat_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
  issued_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_company" ON invoices;
CREATE POLICY "invoices_company" ON invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

-- 3. Verified driver plan tier
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free','standard','verified'));

-- 4. Invoice number sequence per company (simple counter)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

NOTIFY pgrst, 'reload schema';
