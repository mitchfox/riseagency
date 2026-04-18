ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'match';

CREATE INDEX IF NOT EXISTS idx_analyses_category ON public.analyses(category);