-- SMS verification codes (used when TWILIO_VERIFY_SID is not set)
CREATE TABLE IF NOT EXISTS public.sms_verifications (
  phone        text PRIMARY KEY,
  code         text NOT NULL,
  expires_at   timestamptz NOT NULL,
  verified     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-delete expired codes older than 1 hour (keep DB clean)
-- Run: SELECT cron.schedule('cleanup-sms-codes', '0 * * * *', $$DELETE FROM sms_verifications WHERE expires_at < now() - interval '1 hour'$$);

-- Add phone_verified flag to user_profiles and drivers
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- RLS: only service role can read/write sms_verifications (used server-side only)
ALTER TABLE public.sms_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.sms_verifications
  USING (false);   -- blocks all client access; API routes use admin client

NOTIFY pgrst, 'reload schema';
