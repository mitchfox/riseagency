ALTER TABLE public.player_analysis
ADD COLUMN IF NOT EXISTS club_logo_url text,
ADD COLUMN IF NOT EXISTS opposition_color text;