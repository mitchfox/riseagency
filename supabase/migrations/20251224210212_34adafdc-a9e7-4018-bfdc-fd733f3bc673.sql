-- Add full_match_url column to scouting_reports table
ALTER TABLE public.scouting_reports 
ADD COLUMN IF NOT EXISTS full_match_url text;