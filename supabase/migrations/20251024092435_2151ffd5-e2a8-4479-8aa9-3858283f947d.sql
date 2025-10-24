-- Make r90_score nullable in player_analysis table
ALTER TABLE public.player_analysis 
ALTER COLUMN r90_score DROP NOT NULL;