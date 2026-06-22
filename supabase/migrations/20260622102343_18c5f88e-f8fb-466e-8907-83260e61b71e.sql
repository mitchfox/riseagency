ALTER TABLE public.club_outreach_settings
  ADD COLUMN IF NOT EXISTS default_season_data_mode text NOT NULL DEFAULT 'popup',
  ADD COLUMN IF NOT EXISTS default_video_selection_mode text NOT NULL DEFAULT 'all';

ALTER TABLE public.club_outreach_settings
  DROP CONSTRAINT IF EXISTS club_outreach_settings_season_mode_chk;
ALTER TABLE public.club_outreach_settings
  ADD CONSTRAINT club_outreach_settings_season_mode_chk
  CHECK (default_season_data_mode IN ('popup','link'));

ALTER TABLE public.club_outreach_settings
  DROP CONSTRAINT IF EXISTS club_outreach_settings_video_mode_chk;
ALTER TABLE public.club_outreach_settings
  ADD CONSTRAINT club_outreach_settings_video_mode_chk
  CHECK (default_video_selection_mode IN ('all','first','custom'));