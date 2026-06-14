ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translations jsonb;