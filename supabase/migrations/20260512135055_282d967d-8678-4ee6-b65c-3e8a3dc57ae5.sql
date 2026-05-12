ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS example_banner text,
  ADD COLUMN IF NOT EXISTS example_language text;