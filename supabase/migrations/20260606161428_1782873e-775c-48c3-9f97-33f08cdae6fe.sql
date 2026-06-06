ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'ready', 'sent'));

CREATE INDEX IF NOT EXISTS club_outreach_links_status_idx ON public.club_outreach_links(status);