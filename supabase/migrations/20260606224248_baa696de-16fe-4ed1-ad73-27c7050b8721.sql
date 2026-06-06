
ALTER TABLE public.club_outreach_club_contacts
  ADD COLUMN IF NOT EXISTS contact_club_id uuid REFERENCES public.club_map_positions(id) ON DELETE SET NULL;

UPDATE public.club_outreach_club_contacts
SET contact_club_id = club_id
WHERE contact_club_id IS NULL;
