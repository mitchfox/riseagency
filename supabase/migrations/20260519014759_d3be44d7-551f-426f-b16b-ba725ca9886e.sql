
ALTER TABLE public.player_analysis
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS team_roster jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_scouting_report boolean NOT NULL DEFAULT false;

ALTER TABLE public.performance_report_actions
  ADD COLUMN IF NOT EXISTS involved_players jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_player_analysis_report_type ON public.player_analysis(report_type);
CREATE INDEX IF NOT EXISTS idx_player_analysis_is_scouting ON public.player_analysis(is_scouting_report) WHERE is_scouting_report = true;
