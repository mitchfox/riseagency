-- Update coaching_aphorisms table to simplify to featured_text and body_text
ALTER TABLE public.coaching_aphorisms 
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS author,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS tags;

ALTER TABLE public.coaching_aphorisms 
ADD COLUMN IF NOT EXISTS featured_text TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS body_text TEXT NOT NULL DEFAULT '';

-- Remove the old content column if it exists and we have the new columns
ALTER TABLE public.coaching_aphorisms 
DROP COLUMN IF EXISTS content;