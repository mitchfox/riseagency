-- Add category column to marketing_gallery table
ALTER TABLE marketing_gallery
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other' CHECK (category IN ('brand', 'players', 'other'));