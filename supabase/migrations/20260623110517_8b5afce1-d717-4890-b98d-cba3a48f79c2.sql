ALTER TABLE public.club_outreach_player_defaults ADD COLUMN IF NOT EXISTS default_situation TEXT;
ALTER TABLE public.club_outreach_link_players ADD COLUMN IF NOT EXISTS situation TEXT;