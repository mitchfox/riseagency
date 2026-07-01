ALTER TABLE public.players ADD COLUMN IF NOT EXISTS minutes_share smallint;
ALTER TABLE public.player_outreach_youth ADD COLUMN IF NOT EXISTS minutes_share smallint;
ALTER TABLE public.player_outreach_pro ADD COLUMN IF NOT EXISTS minutes_share smallint;