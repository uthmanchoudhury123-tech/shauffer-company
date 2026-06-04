-- Create company_driver_vehicles table (if it doesn't exist) and add photo columns
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.company_driver_vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  company_id    uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  make          text NOT NULL,
  model         text NOT NULL,
  year          integer,
  registration  text NOT NULL,
  color         text,
  car_type      text NOT NULL,
  photo_url     text,
  photo_outside text,
  photo_inside  text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- If the table already existed, add the photo columns safely
ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_outside text;
ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_inside  text;

-- Enable RLS
ALTER TABLE public.company_driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Policies (safe to re-create)
DROP POLICY IF EXISTS "Drivers manage own vehicles" ON public.company_driver_vehicles;
CREATE POLICY "Drivers manage own vehicles"
  ON public.company_driver_vehicles FOR ALL
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Admins view company vehicles" ON public.company_driver_vehicles;
CREATE POLICY "Admins view company vehicles"
  ON public.company_driver_vehicles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
