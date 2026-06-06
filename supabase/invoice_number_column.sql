-- Add invoice_number column to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS jobs_invoice_number_idx ON public.jobs (invoice_number);

NOTIFY pgrst, 'reload schema';
