ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS mandate_proof_path text,
  ADD COLUMN IF NOT EXISTS mandate_proof_url text;