-- Add kit color fields to analyses table
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS kit_primary_color TEXT DEFAULT '#FFD700',
ADD COLUMN IF NOT EXISTS kit_secondary_color TEXT DEFAULT '#000000';