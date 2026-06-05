ALTER TABLE public.recruitment_targets
  ADD COLUMN IF NOT EXISTS weights_override jsonb,
  ADD COLUMN IF NOT EXISTS ai_nudge_enabled boolean;