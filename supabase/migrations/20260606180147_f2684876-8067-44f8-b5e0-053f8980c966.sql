
ALTER TABLE public.club_outreach_settings
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_image_url text;

ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS prepared_for_name text,
  ADD COLUMN IF NOT EXISTS show_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_numbers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_season_stats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_strengths boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.club_outreach_club_contacts (
  club_id uuid PRIMARY KEY REFERENCES public.club_map_positions(id) ON DELETE CASCADE,
  contact_name text,
  contact_role text,
  contact_phone text,
  contact_accent text,
  contact_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_outreach_club_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_club_contacts TO authenticated;
GRANT ALL ON public.club_outreach_club_contacts TO service_role;

ALTER TABLE public.club_outreach_club_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read club outreach contacts"
  ON public.club_outreach_club_contacts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage club outreach contacts"
  ON public.club_outreach_club_contacts FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
