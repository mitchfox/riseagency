CREATE TABLE IF NOT EXISTS public.outreach_strategy_staging (
  strategy_id uuid PRIMARY KEY,
  filters jsonb NOT NULL,
  defaults jsonb NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_strategy_staging TO authenticated;
GRANT ALL ON public.outreach_strategy_staging TO service_role;
ALTER TABLE public.outreach_strategy_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_auth_all" ON public.outreach_strategy_staging FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.apply_outreach_strategy_staging()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.club_outreach_strategies s
  SET filters = t.filters, defaults = t.defaults
  FROM public.outreach_strategy_staging t
  WHERE s.id = t.strategy_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.outreach_strategy_staging;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_outreach_strategy_staging() TO authenticated, service_role;