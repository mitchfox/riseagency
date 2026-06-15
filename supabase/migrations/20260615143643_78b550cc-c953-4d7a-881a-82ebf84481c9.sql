GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_strategy_staging TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.apply_outreach_strategy_staging() TO sandbox_exec;
CREATE POLICY "stage_sandbox_all" ON public.outreach_strategy_staging FOR ALL TO sandbox_exec USING (true) WITH CHECK (true);