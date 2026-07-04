CREATE TABLE public.transfermarkt_refresh_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  total_players int NOT NULL DEFAULT 0,
  total_outreach int NOT NULL DEFAULT 0,
  processed int NOT NULL DEFAULT 0,
  updated int NOT NULL DEFAULT 0,
  with_stats int NOT NULL DEFAULT 0,
  last_processed_name text,
  outreach_done boolean NOT NULL DEFAULT false,
  error text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.transfermarkt_refresh_jobs TO authenticated;
GRANT ALL ON public.transfermarkt_refresh_jobs TO service_role;

ALTER TABLE public.transfermarkt_refresh_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admin can view refresh jobs"
  ON public.transfermarkt_refresh_jobs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admin can create refresh jobs"
  ON public.transfermarkt_refresh_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admin can update refresh jobs"
  ON public.transfermarkt_refresh_jobs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_transfermarkt_refresh_jobs_updated_at
  BEFORE UPDATE ON public.transfermarkt_refresh_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.transfermarkt_refresh_jobs;