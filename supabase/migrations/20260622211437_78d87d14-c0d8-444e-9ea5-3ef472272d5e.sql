ALTER TABLE public.club_outreach_player_defaults
  ADD COLUMN IF NOT EXISTS default_show_form boolean,
  ADD COLUMN IF NOT EXISTS default_show_in_numbers boolean,
  ADD COLUMN IF NOT EXISTS default_show_season_stats boolean,
  ADD COLUMN IF NOT EXISTS default_show_strengths boolean,
  ADD COLUMN IF NOT EXISTS default_section_order jsonb;