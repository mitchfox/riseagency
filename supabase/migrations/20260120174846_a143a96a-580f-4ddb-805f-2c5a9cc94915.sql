-- Add player_name column to analyses table for post-match analysis display
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS player_name TEXT;

COMMENT ON COLUMN public.analyses.player_name IS 'Display name for player in post-match analysis';