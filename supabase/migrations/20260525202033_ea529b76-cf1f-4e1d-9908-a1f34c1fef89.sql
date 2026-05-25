
-- Restore scout access via scout_id (scouts use custom auth, not Supabase auth)

-- scouting_reports
CREATE POLICY "Scouts can select their reports via scout_id"
  ON public.scouting_reports FOR SELECT
  USING (scout_id IS NOT NULL);

CREATE POLICY "Scouts can insert reports via scout_id"
  ON public.scouting_reports FOR INSERT
  WITH CHECK (scout_id IS NOT NULL);

CREATE POLICY "Scouts can update their own reports via scout_id"
  ON public.scouting_reports FOR UPDATE
  USING (scout_id IS NOT NULL);

-- scouting_report_drafts
CREATE POLICY "Scouts can select drafts via scout_id"
  ON public.scouting_report_drafts FOR SELECT
  USING (scout_id IS NOT NULL);

CREATE POLICY "Scouts can insert drafts via scout_id"
  ON public.scouting_report_drafts FOR INSERT
  WITH CHECK (scout_id IS NOT NULL);

CREATE POLICY "Scouts can update drafts via scout_id"
  ON public.scouting_report_drafts FOR UPDATE
  USING (scout_id IS NOT NULL);

CREATE POLICY "Scouts can delete drafts via scout_id"
  ON public.scouting_report_drafts FOR DELETE
  USING (scout_id IS NOT NULL);

-- scout_report_feedback (scouts read feedback addressed to them)
CREATE POLICY "Scouts can read their feedback"
  ON public.scout_report_feedback FOR SELECT
  USING (scout_id IS NOT NULL);
