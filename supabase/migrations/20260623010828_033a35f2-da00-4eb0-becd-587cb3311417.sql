ALTER TABLE public.club_outreach_player_defaults
  ADD COLUMN IF NOT EXISTS transfermarkt_url text,
  ADD COLUMN IF NOT EXISTS match_by_match_stat_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS match_by_match_game_order jsonb NOT NULL DEFAULT '[]'::jsonb;