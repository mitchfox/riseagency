-- Create club_outreach table for staff to track club contacts
CREATE TABLE public.club_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_name TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT,
  status TEXT NOT NULL DEFAULT 'contacted',
  latest_update TEXT,
  latest_update_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create club_outreach_updates table for update history
CREATE TABLE public.club_outreach_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id UUID NOT NULL REFERENCES public.club_outreach(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create player_club_submissions table for players to add their own outreach
CREATE TABLE public.player_club_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_name TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'contacted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_outreach_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_club_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for club_outreach
CREATE POLICY "Staff can manage club_outreach"
ON public.club_outreach
FOR ALL
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Players can view their own club_outreach"
ON public.club_outreach
FOR SELECT
USING (player_id IN (
  SELECT id FROM public.players WHERE email = (auth.jwt() ->> 'email')
));

-- RLS Policies for club_outreach_updates
CREATE POLICY "Staff can manage club_outreach_updates"
ON public.club_outreach_updates
FOR ALL
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Players can view updates for their outreach"
ON public.club_outreach_updates
FOR SELECT
USING (outreach_id IN (
  SELECT co.id FROM public.club_outreach co
  JOIN public.players p ON co.player_id = p.id
  WHERE p.email = (auth.jwt() ->> 'email')
));

-- RLS Policies for player_club_submissions
CREATE POLICY "Staff can view all player_club_submissions"
ON public.player_club_submissions
FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Players can manage their own submissions"
ON public.player_club_submissions
FOR ALL
USING (player_id IN (
  SELECT id FROM public.players WHERE email = (auth.jwt() ->> 'email')
))
WITH CHECK (player_id IN (
  SELECT id FROM public.players WHERE email = (auth.jwt() ->> 'email')
));

-- Trigger for updated_at
CREATE TRIGGER update_club_outreach_updated_at
BEFORE UPDATE ON public.club_outreach
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_club_submissions_updated_at
BEFORE UPDATE ON public.player_club_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();