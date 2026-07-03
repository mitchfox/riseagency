
CREATE TABLE public.club_rating_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL,
  country TEXT,
  current_first TEXT,
  current_academy TEXT,
  suggested_first TEXT,
  suggested_academy TEXT,
  reasoning TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (club_name, status)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_rating_suggestions TO authenticated;
GRANT ALL ON public.club_rating_suggestions TO service_role;

ALTER TABLE public.club_rating_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view club rating suggestions"
  ON public.club_rating_suggestions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can insert club rating suggestions"
  ON public.club_rating_suggestions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can update club rating suggestions"
  ON public.club_rating_suggestions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can delete club rating suggestions"
  ON public.club_rating_suggestions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_club_rating_suggestions_updated_at
  BEFORE UPDATE ON public.club_rating_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
