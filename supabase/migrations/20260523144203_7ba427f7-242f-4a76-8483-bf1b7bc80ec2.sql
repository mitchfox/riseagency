CREATE TABLE IF NOT EXISTS public.investor_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'New projection',
  scenario text NOT NULL DEFAULT 'expected',
  notes text,
  player_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_income_gbp numeric NOT NULL DEFAULT 0,
  costs_gbp numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all" ON public.investor_projections;
CREATE POLICY "deny all"
ON public.investor_projections
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE INDEX IF NOT EXISTS investor_projections_display_order_idx
ON public.investor_projections (display_order, created_at);

DROP TRIGGER IF EXISTS update_investor_projections_updated_at ON public.investor_projections;
CREATE TRIGGER update_investor_projections_updated_at
BEFORE UPDATE ON public.investor_projections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();