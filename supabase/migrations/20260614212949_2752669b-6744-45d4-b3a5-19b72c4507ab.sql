
DO $$ BEGIN
  CREATE TYPE public.outreach_rapport_level AS ENUM ('cold','warming','friendly','trusted','champion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.outreach_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL UNIQUE REFERENCES public.club_network_contacts(id) ON DELETE CASCADE,
  rapport_level public.outreach_rapport_level NOT NULL DEFAULT 'cold',
  nudge_week_start date,
  nudge_dates date[] NOT NULL DEFAULT '{}',
  last_outreach_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_relationships TO authenticated;
GRANT ALL ON public.outreach_relationships TO service_role;
ALTER TABLE public.outreach_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage relationships" ON public.outreach_relationships
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Authenticated view relationships" ON public.outreach_relationships
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_outreach_relationships_updated
  BEFORE UPDATE ON public.outreach_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.outreach_relationship_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.outreach_relationships(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_relationship_notes TO authenticated;
GRANT ALL ON public.outreach_relationship_notes TO service_role;
ALTER TABLE public.outreach_relationship_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage relationship notes" ON public.outreach_relationship_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Authenticated view relationship notes" ON public.outreach_relationship_notes
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.bump_relationship_last_outreach()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.outreach_relationships
    SET last_outreach_at = now(), updated_at = now()
    WHERE id = NEW.relationship_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bump_relationship_last_outreach
  AFTER INSERT ON public.outreach_relationship_notes
  FOR EACH ROW EXECUTE FUNCTION public.bump_relationship_last_outreach();

CREATE INDEX idx_relationship_notes_rel ON public.outreach_relationship_notes(relationship_id, created_at DESC);
