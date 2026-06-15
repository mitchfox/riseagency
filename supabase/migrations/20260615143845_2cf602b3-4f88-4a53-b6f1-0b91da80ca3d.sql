CREATE TABLE IF NOT EXISTS public.investor_other_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL,
  amount_gbp numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_other_income TO authenticated;
GRANT ALL ON public.investor_other_income TO service_role;

ALTER TABLE public.investor_other_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read other income"
  ON public.investor_other_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert other income"
  ON public.investor_other_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update other income"
  ON public.investor_other_income FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete other income"
  ON public.investor_other_income FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_investor_other_income_updated_at
  BEFORE UPDATE ON public.investor_other_income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_investor_other_income_date ON public.investor_other_income (income_date DESC);