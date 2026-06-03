-- ============================================================
-- FIX: "Database error saving new user" on signup
-- Root cause: handle_new_user trigger missing COALESCE for
--             full_name (NOT NULL column) + no exception handler
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite_token  TEXT;
  v_company_id    UUID;
  v_role          TEXT;
  v_full_name     TEXT;
BEGIN
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  -- If there's an invite token, look up the company + role from it
  IF v_invite_token IS NOT NULL THEN
    BEGIN
      SELECT company_id, role
        INTO v_company_id, v_role
        FROM public.invites
       WHERE token = v_invite_token::UUID
         AND status = 'pending'
         AND expires_at > NOW()
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore bad invite tokens — just proceed without company link
      v_company_id := NULL;
      v_role := NULL;
    END;
  END IF;

  -- Fall back to metadata role if not from invite
  IF v_role IS NULL THEN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'company_driver');
  END IF;

  -- Full name: prefer metadata, fallback to email
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NEW.email
  );

  INSERT INTO public.user_profiles (id, email, role, full_name, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_role::public.user_role,
    v_full_name,
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), public.user_profiles.full_name),
        company_id = COALESCE(EXCLUDED.company_id, public.user_profiles.company_id),
        role       = COALESCE(EXCLUDED.role, public.user_profiles.role);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block auth — user can still sign in
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
