-- Add optional match_image_url field to analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS match_image_url text;