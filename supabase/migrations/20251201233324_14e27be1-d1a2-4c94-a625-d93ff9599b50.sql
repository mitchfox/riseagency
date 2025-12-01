-- Add highlighted_match column to players table
ALTER TABLE public.players 
ADD COLUMN highlighted_match JSONB DEFAULT NULL;

COMMENT ON COLUMN public.players.highlighted_match IS 'Stores highlighted match data including teams, score, stats, and media links for featured match display on player profiles';
