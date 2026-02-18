
-- Add granular feature visibility columns
ALTER TABLE public.player_portal_settings
  ADD COLUMN IF NOT EXISTS show_aphorisms BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_quick_stats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_news_feed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_r90_chart BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_match_clipper BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_positional_guides BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_video_reports BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_data_tab BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_performance_reports BOOLEAN NOT NULL DEFAULT true;
