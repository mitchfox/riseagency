
ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS is_mandated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_details jsonb,
  ADD COLUMN IF NOT EXISTS section_order jsonb;
