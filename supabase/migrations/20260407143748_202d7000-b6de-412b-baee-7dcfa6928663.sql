CREATE TABLE public.transfer_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  included_sections TEXT[] NOT NULL DEFAULT '{}',
  content_config JSONB NOT NULL DEFAULT '{}',
  custom_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their own transfer reports"
  ON public.transfer_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Published reports are publicly viewable"
  ON public.transfer_reports
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE TRIGGER update_transfer_reports_updated_at
  BEFORE UPDATE ON public.transfer_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();