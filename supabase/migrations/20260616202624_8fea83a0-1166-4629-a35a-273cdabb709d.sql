ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS is_suggested_to_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_agent_note text;