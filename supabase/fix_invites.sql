-- ── Fix invites table & RLS ──────────────────────────────────────────────────

-- Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email       TEXT,
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL DEFAULT 'company_driver',
  invited_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_at     TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'used', 'expired', 'cancelled'))
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Drop old broken policies
DROP POLICY IF EXISTS "invites_admin" ON public.invites;
DROP POLICY IF EXISTS "invites_select" ON public.invites;
DROP POLICY IF EXISTS "invites_insert" ON public.invites;
DROP POLICY IF EXISTS "invites_update" ON public.invites;
DROP POLICY IF EXISTS "invites_delete" ON public.invites;

-- Admins can view invites for their own company
CREATE POLICY "invites_select" ON public.invites
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
    AND (
      SELECT role FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    ) = 'company_admin'
  );

-- Admins can create invites for their own company
CREATE POLICY "invites_insert" ON public.invites
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
    AND (
      SELECT role FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    ) = 'company_admin'
  );

-- Admins can cancel their own company's invites
CREATE POLICY "invites_update" ON public.invites
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
    AND (
      SELECT role FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    ) = 'company_admin'
  );

-- ── Update handle_new_user trigger to link invite token automatically ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite_token  TEXT;
  v_company_id    UUID;
  v_role          TEXT;
BEGIN
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  -- If there's an invite token, look up the company + role from it
  IF v_invite_token IS NOT NULL THEN
    SELECT company_id, role
      INTO v_company_id, v_role
      FROM public.invites
     WHERE token = v_invite_token::UUID
       AND status = 'pending'
       AND expires_at > NOW()
     LIMIT 1;
  END IF;

  -- Fall back to metadata role if not from invite
  IF v_role IS NULL THEN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'company_driver');
  END IF;

  INSERT INTO public.user_profiles (id, email, role, full_name, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    NEW.raw_user_meta_data->>'full_name',
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        full_name  = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
        company_id = COALESCE(EXCLUDED.company_id, public.user_profiles.company_id),
        role       = COALESCE(EXCLUDED.role, public.user_profiles.role);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
