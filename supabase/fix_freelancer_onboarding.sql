-- ============================================================
-- Fix existing freelance_driver accounts that don't have a
-- drivers table row / onboarding_complete flag.
-- Run in Supabase SQL Editor.
-- ============================================================

INSERT INTO public.drivers (id, full_name, car_type, driver_category, onboarding_complete)
SELECT
  up.id,
  up.full_name,
  'saloon',
  'freelance',
  true
FROM public.user_profiles up
LEFT JOIN public.drivers d ON d.id = up.id
WHERE up.role = 'freelance_driver'
  AND d.id IS NULL
ON CONFLICT (id) DO UPDATE
  SET onboarding_complete = true;

-- Also mark any existing freelance driver rows that somehow
-- have onboarding_complete = false
UPDATE public.drivers d
SET onboarding_complete = true
FROM public.user_profiles up
WHERE d.id = up.id
  AND up.role = 'freelance_driver'
  AND d.onboarding_complete = false;
