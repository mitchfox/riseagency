-- Add star_order and player_list_order columns to players table for ordering
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS star_order integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS player_list_order integer DEFAULT NULL;

-- Create indexes for ordering
CREATE INDEX IF NOT EXISTS idx_players_star_order ON public.players(star_order NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_players_player_list_order ON public.players(player_list_order NULLS LAST);