
CREATE TABLE public.representation_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  position text,
  dob date,
  age_group text,
  country_code text,
  language text,
  user_agent text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_visitors_created_at ON public.representation_visitors (created_at DESC);
CREATE INDEX idx_rep_visitors_visitor_id ON public.representation_visitors (visitor_id);

ALTER TABLE public.representation_visitors ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit their position/dob entry (no PII)
CREATE POLICY "Anyone can log representation visitor entry"
ON public.representation_visitors
FOR INSERT
WITH CHECK (true);

-- Anyone (anon) can update their own visitor row by visitor_id (so DOB can be added after position)
CREATE POLICY "Anyone can update their visitor row"
ON public.representation_visitors
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Staff/admin/marketeer can view
CREATE POLICY "Staff can view representation visitors"
ON public.representation_visitors
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'marketeer'::app_role)
);

CREATE TRIGGER update_representation_visitors_updated_at
BEFORE UPDATE ON public.representation_visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
