CREATE TABLE public.scouting_country_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  age_group text NOT NULL DEFAULT 'General',
  label text NOT NULL,
  url text NOT NULL,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_country_links TO authenticated;
GRANT ALL ON public.scouting_country_links TO service_role;

ALTER TABLE public.scouting_country_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view scouting links"
  ON public.scouting_country_links FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can insert scouting links"
  ON public.scouting_country_links FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can update scouting links"
  ON public.scouting_country_links FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can delete scouting links"
  ON public.scouting_country_links FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_scouting_country_links_updated_at
  BEFORE UPDATE ON public.scouting_country_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scouting_country_links_country ON public.scouting_country_links (country, age_group, sort_order);