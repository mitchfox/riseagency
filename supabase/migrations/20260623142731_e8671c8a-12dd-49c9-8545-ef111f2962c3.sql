ALTER TABLE public.club_outreach_link_players
  ADD COLUMN IF NOT EXISTS show_form boolean,
  ADD COLUMN IF NOT EXISTS show_in_numbers boolean,
  ADD COLUMN IF NOT EXISTS show_season_stats boolean,
  ADD COLUMN IF NOT EXISTS show_strengths boolean,
  ADD COLUMN IF NOT EXISTS season_data_mode text,
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.player_seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_video_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_details jsonb,
  ADD COLUMN IF NOT EXISTS section_order jsonb;

ALTER TABLE public.club_outreach_link_players
  DROP CONSTRAINT IF EXISTS club_outreach_link_players_season_data_mode_check;

ALTER TABLE public.club_outreach_link_players
  ADD CONSTRAINT club_outreach_link_players_season_data_mode_check
  CHECK (season_data_mode IS NULL OR season_data_mode IN ('popup', 'link'));