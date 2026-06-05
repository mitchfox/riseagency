CREATE TABLE public.investor_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  achieved_on DATE NOT NULL DEFAULT CURRENT_DATE,
  author_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.investor_updates TO service_role;

ALTER TABLE public.investor_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all" ON public.investor_updates FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER update_investor_updates_updated_at
  BEFORE UPDATE ON public.investor_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investor_updates_achieved_on ON public.investor_updates(achieved_on DESC);