-- Add new language columns to translations table
ALTER TABLE public.translations
ADD COLUMN IF NOT EXISTS french text,
ADD COLUMN IF NOT EXISTS german text,
ADD COLUMN IF NOT EXISTS italian text,
ADD COLUMN IF NOT EXISTS polish text;