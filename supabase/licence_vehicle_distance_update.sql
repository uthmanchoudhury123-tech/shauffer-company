-- ============================================================
-- Schema update: licences, vehicle photos, distance, MOT
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. DVLA: rename single photo → front, add back
ALTER TABLE public.drivers RENAME COLUMN dvla_licence_photo TO dvla_photo_front;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS dvla_photo_back TEXT;

-- 2. TFL Driver: rename photo → front, add back
ALTER TABLE public.drivers RENAME COLUMN tfl_licence_photo TO tfl_driver_photo_front;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tfl_driver_photo_back TEXT;

-- 3. TFL Vehicle (new)
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tfl_vehicle_number TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tfl_vehicle_expiry DATE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tfl_vehicle_photo_front TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tfl_vehicle_photo_back TEXT;

-- 4. Hertsmere (rename from hertz)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='hertz_licence_number') THEN
    ALTER TABLE public.drivers RENAME COLUMN hertz_licence_number TO hertsmere_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='hertz_licence_expiry') THEN
    ALTER TABLE public.drivers RENAME COLUMN hertz_licence_expiry TO hertsmere_expiry;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='hertz_licence_photo') THEN
    ALTER TABLE public.drivers RENAME COLUMN hertz_licence_photo TO hertsmere_photo_front;
  END IF;
END $$;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS hertsmere_photo_back TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS hertsmere_number TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS hertsmere_expiry DATE;

-- 5. Vehicle photos: inside + outside (rename existing)
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_photo_outside TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_photo_inside TEXT;

-- 6. MOT expiry on drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS mot_expiry DATE;

-- 7. Distance on jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS distance_miles NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';
