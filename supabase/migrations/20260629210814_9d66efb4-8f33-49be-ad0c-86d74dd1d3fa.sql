
ALTER TABLE public.club_outreach_links 
  ADD COLUMN IF NOT EXISTS response_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS response_notes text,
  ADD COLUMN IF NOT EXISTS response_at timestamptz;

ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS outreach_response_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS outreach_response_notes text,
  ADD COLUMN IF NOT EXISTS outreach_response_at timestamptz;
