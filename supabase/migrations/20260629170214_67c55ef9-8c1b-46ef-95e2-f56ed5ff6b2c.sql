
ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS scroll_max_pct integer,
  ADD COLUMN IF NOT EXISTS engaged_seconds integer,
  ADD COLUMN IF NOT EXISTS events jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS viewport jsonb,
  ADD COLUMN IF NOT EXISTS utm jsonb,
  ADD COLUMN IF NOT EXISTS video_stats jsonb NOT NULL DEFAULT '{}'::jsonb;
