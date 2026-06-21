CREATE TABLE public.proposal_meeting_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NULL REFERENCES public.players(id) ON DELETE SET NULL,
  player_slug TEXT NULL,
  player_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  preferred_dates TEXT NULL,
  preferred_time_of_day TEXT NULL,
  message TEXT NULL,
  language TEXT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.proposal_meeting_requests TO anon;
GRANT INSERT ON public.proposal_meeting_requests TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.proposal_meeting_requests TO authenticated;
GRANT ALL ON public.proposal_meeting_requests TO service_role;

ALTER TABLE public.proposal_meeting_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a meeting request"
  ON public.proposal_meeting_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff and admin can read meeting requests"
  ON public.proposal_meeting_requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Staff and admin can update meeting requests"
  ON public.proposal_meeting_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Admin can delete meeting requests"
  ON public.proposal_meeting_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_proposal_meeting_requests_updated_at
  BEFORE UPDATE ON public.proposal_meeting_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX proposal_meeting_requests_created_at_idx
  ON public.proposal_meeting_requests (created_at DESC);
CREATE INDEX proposal_meeting_requests_player_id_idx
  ON public.proposal_meeting_requests (player_id);
