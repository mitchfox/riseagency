
CREATE TABLE public.investor_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'event',
  title TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE,
  amount_gbp NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct access to investor_timeline"
  ON public.investor_timeline
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TRIGGER update_investor_timeline_updated_at
  BEFORE UPDATE ON public.investor_timeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investor_timeline_start_date ON public.investor_timeline(start_date);
