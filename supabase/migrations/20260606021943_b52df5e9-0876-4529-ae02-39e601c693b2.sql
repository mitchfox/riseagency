ALTER TABLE public.recruitment_scoring_settings
ADD COLUMN IF NOT EXISTS position_weights jsonb NOT NULL DEFAULT '{}'::jsonb;