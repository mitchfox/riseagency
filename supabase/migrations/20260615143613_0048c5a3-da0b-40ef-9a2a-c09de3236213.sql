GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_strategy_staging TO anon;
CREATE POLICY "stage_anon_all" ON public.outreach_strategy_staging FOR ALL TO anon USING (true) WITH CHECK (true);