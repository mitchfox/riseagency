-- Multi-video, alternate profiles, data popup toggle for outreach links
ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS selected_video_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternate_profile_link_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternate_profiles_blurb text,
  ADD COLUMN IF NOT EXISTS season_data_mode text NOT NULL DEFAULT 'popup'
    CHECK (season_data_mode IN ('popup', 'link'));

-- Matching per-player defaults
ALTER TABLE public.club_outreach_player_defaults
  ADD COLUMN IF NOT EXISTS default_selected_video_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_alternate_profile_link_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_alternate_profiles_blurb text,
  ADD COLUMN IF NOT EXISTS default_season_data_mode text
    CHECK (default_season_data_mode IN ('popup', 'link')),
  ADD COLUMN IF NOT EXISTS default_key_details jsonb;