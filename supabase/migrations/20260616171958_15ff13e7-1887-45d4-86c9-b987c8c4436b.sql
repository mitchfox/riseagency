ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS mandated_agent_name text,
  ADD COLUMN IF NOT EXISTS mandated_agent_role text,
  ADD COLUMN IF NOT EXISTS mandated_agent_phone text,
  ADD COLUMN IF NOT EXISTS mandated_agent_logo_url text;