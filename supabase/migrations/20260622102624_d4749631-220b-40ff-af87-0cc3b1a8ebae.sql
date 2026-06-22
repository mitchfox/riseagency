ALTER TABLE public.player_offer_settings
  ADD COLUMN IF NOT EXISTS intro_media jsonb NOT NULL DEFAULT '[]'::jsonb;