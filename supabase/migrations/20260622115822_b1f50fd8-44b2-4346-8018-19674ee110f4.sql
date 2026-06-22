CREATE TABLE public.market_table_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_table_key text NOT NULL,
  club_id uuid NOT NULL REFERENCES public.club_map_positions(id) ON DELETE CASCADE,
  technical_director_name text,
  chief_scout_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (market_table_key, club_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_table_entries TO authenticated;
GRANT ALL ON public.market_table_entries TO service_role;

ALTER TABLE public.market_table_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read market table entries"
  ON public.market_table_entries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert market table entries"
  ON public.market_table_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update market table entries"
  ON public.market_table_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete market table entries"
  ON public.market_table_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_market_table_entries_updated_at
  BEFORE UPDATE ON public.market_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();