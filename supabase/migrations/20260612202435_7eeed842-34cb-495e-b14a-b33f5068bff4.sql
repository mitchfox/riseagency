ALTER TABLE public.club_outreach_links ALTER COLUMN club_id DROP NOT NULL;
ALTER TABLE public.club_outreach_links ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'club';
ALTER TABLE public.club_outreach_links ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE public.club_outreach_links ADD COLUMN IF NOT EXISTS agent_logo_url text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_outreach_links_target_type_check') THEN
    ALTER TABLE public.club_outreach_links ADD CONSTRAINT club_outreach_links_target_type_check CHECK (target_type IN ('club','agent'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_club_outreach_links_target_type ON public.club_outreach_links(target_type);