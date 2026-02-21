-- Add match_time column to fixtures for countdown precision
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS match_time TEXT DEFAULT NULL;

COMMENT ON COLUMN public.fixtures.match_time IS 'Match kick-off time in HH:MM format (24hr), used for countdown precision';