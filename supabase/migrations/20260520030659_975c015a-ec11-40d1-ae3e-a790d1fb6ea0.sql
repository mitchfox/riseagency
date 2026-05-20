ALTER TABLE public.player_portal_settings
  ADD COLUMN IF NOT EXISTS rise_with_us_under18 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS representation_subtitle_secondary text;

ALTER TABLE public.investor_overview_cards
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS detail_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;