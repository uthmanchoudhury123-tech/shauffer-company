-- Run this in Supabase SQL Editor
-- Adds the invites table for the driver invite system

CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email       TEXT,
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  role        public.user_role NOT NULL DEFAULT 'company_driver',
  invited_by  UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_at     TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'used', 'expired', 'cancelled'))
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage invites for their own company
CREATE POLICY "invites_admin" ON public.invites
  FOR ALL USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() = 'company_admin'
  );

-- Also update handle_new_user to handle company_id from invite metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'company_id')::UUID
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
