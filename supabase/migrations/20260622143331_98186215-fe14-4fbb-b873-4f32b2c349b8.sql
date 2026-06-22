-- Allow table_editor role to read & write market tables and supporting data
CREATE POLICY "Table editors can read outreach strategies"
  ON public.club_outreach_strategies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can insert outreach strategies"
  ON public.club_outreach_strategies FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can update outreach strategies"
  ON public.club_outreach_strategies FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can delete outreach strategies"
  ON public.club_outreach_strategies FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));

CREATE POLICY "Table editors can read market table entries"
  ON public.market_table_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can insert market table entries"
  ON public.market_table_entries FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can update market table entries"
  ON public.market_table_entries FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));
CREATE POLICY "Table editors can delete market table entries"
  ON public.market_table_entries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role));

CREATE POLICY "Table editors can manage club network contacts"
  ON public.club_network_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'table_editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'table_editor'::app_role));

-- Enable edit on marketing gallery for the marketing_gallery role (was view-only)
UPDATE public.role_permissions
   SET can_edit = true
 WHERE role = 'marketing_gallery'
   AND section_id = 'marketinggallery';