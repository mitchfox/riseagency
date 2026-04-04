-- Add new columns to club_network_contacts
ALTER TABLE public.club_network_contacts
  ADD COLUMN IF NOT EXISTS pinned_note text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS referred_by_contact_id uuid REFERENCES public.club_network_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_strength integer DEFAULT 0;

-- Create contact_interactions table
CREATE TABLE IF NOT EXISTS public.contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.club_network_contacts(id) ON DELETE CASCADE,
  interaction_type text NOT NULL DEFAULT 'note',
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view interactions"
  ON public.contact_interactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create interactions"
  ON public.contact_interactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interactions"
  ON public.contact_interactions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interactions"
  ON public.contact_interactions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_referred_by ON public.club_network_contacts(referred_by_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_strength ON public.club_network_contacts(contact_strength DESC);