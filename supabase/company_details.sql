-- Extended company profile fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS website     TEXT,
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS postcode    TEXT,
  ADD COLUMN IF NOT EXISTS country     TEXT NOT NULL DEFAULT 'United Kingdom',
  ADD COLUMN IF NOT EXISTS description TEXT;
