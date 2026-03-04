ALTER TABLE public.player_analysis 
  ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS placeholder_raw_score NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS placeholder_minutes INTEGER DEFAULT NULL;