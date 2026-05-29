ALTER TABLE public.player_analysis
  ADD COLUMN IF NOT EXISTS season_final boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_player_analysis_season_final
  ON public.player_analysis(player_id, analysis_date) WHERE season_final;