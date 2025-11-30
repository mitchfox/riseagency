-- Add Turkish column to translations table
ALTER TABLE public.translations ADD COLUMN IF NOT EXISTS turkish text;