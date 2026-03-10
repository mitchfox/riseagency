
ALTER TABLE public.player_analysis ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz DEFAULT NULL;
ALTER TABLE public.player_analysis ADD COLUMN IF NOT EXISTS translated_content jsonb DEFAULT NULL;

ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz DEFAULT NULL;
