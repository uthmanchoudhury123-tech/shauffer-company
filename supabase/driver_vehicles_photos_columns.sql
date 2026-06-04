-- Create company_driver_vehicles table (no FK constraints — avoids reference errors)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.company_driver_vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid,
  company_id    uuid,
  make          text NOT NULL,
  model         text NOT NULL,
  year          integer,
  registration  text NOT NULL,
  color         text,
  car_type      text NOT NULL DEFAULT 'saloon',
  photo_url     text,
  photo_outside text,
  photo_inside  text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_outside text;
ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_inside  text;

ALTER TABLE public.company_driver_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers manage own vehicles" ON public.company_driver_vehicles;
CREATE POLICY "Drivers manage own vehicles"
  ON public.company_driver_vehicles FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

NOTIFY pgrst, 'reload schema';
