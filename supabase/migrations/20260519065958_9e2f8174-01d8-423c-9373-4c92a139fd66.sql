ALTER TABLE public.player_analysis
ADD COLUMN IF NOT EXISTS team_scoring_method text NOT NULL DEFAULT 'option_a';