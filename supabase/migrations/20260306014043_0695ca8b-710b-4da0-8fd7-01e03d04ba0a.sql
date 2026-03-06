
ALTER TABLE public.player_portal_settings 
  ADD COLUMN IF NOT EXISTS show_music_player boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS music_tracks jsonb DEFAULT '[]'::jsonb;
