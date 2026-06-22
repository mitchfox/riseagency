ALTER TABLE public.player_analysis
  ADD COLUMN IF NOT EXISTS data_unavailable boolean NOT NULL DEFAULT false;