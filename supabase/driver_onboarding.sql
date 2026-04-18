-- Track whether driver has completed their onboarding profile
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Vehicle photo for admin fleet table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
