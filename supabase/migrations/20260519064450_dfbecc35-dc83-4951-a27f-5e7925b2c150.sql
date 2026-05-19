ALTER TABLE public.player_analysis
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS team_logo_url text,
ADD COLUMN IF NOT EXISTS team_color text,
ADD COLUMN IF NOT EXISTS opponent_logo_url text;