
ALTER TABLE public.club_outreach_settings ADD COLUMN IF NOT EXISTS default_fit_recommendation text;

CREATE TABLE IF NOT EXISTS public.club_outreach_quick_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_quick_templates TO authenticated;
GRANT ALL ON public.club_outreach_quick_templates TO service_role;

ALTER TABLE public.club_outreach_quick_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff/admin manage outreach quick templates"
ON public.club_outreach_quick_templates
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Authenticated read outreach quick templates"
ON public.club_outreach_quick_templates
FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_club_outreach_quick_templates_updated_at
BEFORE UPDATE ON public.club_outreach_quick_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
