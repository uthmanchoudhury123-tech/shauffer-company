-- Add inside/outside photo columns to vehicles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_outside TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_inside  TEXT;

NOTIFY pgrst, 'reload schema';
