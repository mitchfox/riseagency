
ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.player_seasons(id) ON DELETE SET NULL;

ALTER TABLE public.club_outreach_player_defaults
  ADD COLUMN IF NOT EXISTS default_season_id uuid REFERENCES public.player_seasons(id) ON DELETE SET NULL;
