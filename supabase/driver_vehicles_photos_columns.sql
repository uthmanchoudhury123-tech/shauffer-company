-- Add inside/outside photo columns to company_driver_vehicles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_outside TEXT;
ALTER TABLE public.company_driver_vehicles ADD COLUMN IF NOT EXISTS photo_inside  TEXT;

NOTIFY pgrst, 'reload schema';
