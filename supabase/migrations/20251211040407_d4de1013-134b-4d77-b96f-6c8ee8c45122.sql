
-- Add Croatian and Norwegian columns to translations table
ALTER TABLE translations ADD COLUMN IF NOT EXISTS croatian text;
ALTER TABLE translations ADD COLUMN IF NOT EXISTS norwegian text;
