ALTER TABLE public.player_analysis
  ADD COLUMN IF NOT EXISTS is_todo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS todo_note text;
CREATE INDEX IF NOT EXISTS idx_player_analysis_is_todo ON public.player_analysis (is_todo) WHERE is_todo = true;