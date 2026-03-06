ALTER TABLE public.player_portal_settings
ADD COLUMN IF NOT EXISTS has_seen_welcome_modal boolean NOT NULL DEFAULT false;