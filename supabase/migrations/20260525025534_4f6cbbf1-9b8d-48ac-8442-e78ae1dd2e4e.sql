
-- 1. club_network_contacts: remove anon SELECT
DROP POLICY IF EXISTS "Investor portal can view club network contacts" ON public.club_network_contacts;

-- 2. marketing_templates: remove anon SELECT
DROP POLICY IF EXISTS "Investor portal can view marketing templates" ON public.marketing_templates;

-- 3. club_outreach: remove permissive public SELECT (authenticated users still have their own SELECT policy)
DROP POLICY IF EXISTS "Anyone can view club_outreach for players" ON public.club_outreach;

-- 4. player_offer_settings: remove open write/delete/read and replace with staff/admin
DROP POLICY IF EXISTS "Open offer settings delete" ON public.player_offer_settings;
DROP POLICY IF EXISTS "Open offer settings insert" ON public.player_offer_settings;
DROP POLICY IF EXISTS "Open offer settings update" ON public.player_offer_settings;
DROP POLICY IF EXISTS "Public can read offer settings" ON public.player_offer_settings;

CREATE POLICY "Authenticated can read offer settings"
  ON public.player_offer_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff/admin can insert offer settings"
  ON public.player_offer_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff/admin can update offer settings"
  ON public.player_offer_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff/admin can delete offer settings"
  ON public.player_offer_settings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. staff_player_assignments: remove "Open" permissive policies
DROP POLICY IF EXISTS "Open assignments delete" ON public.staff_player_assignments;
DROP POLICY IF EXISTS "Open assignments insert" ON public.staff_player_assignments;
DROP POLICY IF EXISTS "Open assignments select" ON public.staff_player_assignments;

CREATE POLICY "Authenticated can view staff assignments"
  ON public.staff_player_assignments FOR SELECT TO authenticated
  USING (true);

-- 6. player_operating_profile: lock down to authenticated and staff/admin (player questionnaire stored against player_id)
DROP POLICY IF EXISTS "Anyone can view operating profile" ON public.player_operating_profile;
DROP POLICY IF EXISTS "Authenticated can insert operating profile" ON public.player_operating_profile;
DROP POLICY IF EXISTS "Authenticated can update operating profile" ON public.player_operating_profile;

CREATE POLICY "Authenticated can view operating profile"
  ON public.player_operating_profile FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert operating profile"
  ON public.player_operating_profile FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update operating profile"
  ON public.player_operating_profile FOR UPDATE TO authenticated
  USING (true);

-- 7. Storage: receipt-uploads — remove public SELECT, restrict to authenticated staff/admin
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;

CREATE POLICY "Staff/admin can view receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipt-uploads' AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Staff/admin can upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipt-uploads' AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Staff/admin can delete receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipt-uploads' AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- 8. Storage: signature-contracts — remove public SELECT, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view signature contracts" ON storage.objects;

CREATE POLICY "Authenticated can view signature contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signature-contracts');

-- 9. scout_report_feedback: drop public SELECT/manage; restrict to authenticated staff/admin
DROP POLICY IF EXISTS "Scouts can read their feedback" ON public.scout_report_feedback;
DROP POLICY IF EXISTS "Staff can manage all feedback" ON public.scout_report_feedback;

CREATE POLICY "Staff/admin can manage feedback"
  ON public.scout_report_feedback FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 10. scouting_reports: remove permissive scout_id-only public policies (kept admin/marketeer + authenticated select)
DROP POLICY IF EXISTS "Scouts can select their reports via scout_id" ON public.scouting_reports;
DROP POLICY IF EXISTS "Scouts can insert reports via scout_id" ON public.scouting_reports;
DROP POLICY IF EXISTS "Scouts can update their own reports via scout_id" ON public.scouting_reports;
DROP POLICY IF EXISTS "Scouts can view their own reports" ON public.scouting_reports;
DROP POLICY IF EXISTS "Scouts can create reports" ON public.scouting_reports;

-- 11. scouting_report_drafts: remove permissive scout_id-only public policies
DROP POLICY IF EXISTS "Scouts can select drafts via scout_id" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can insert drafts via scout_id" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can update drafts via scout_id" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can delete drafts via scout_id" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can view their own drafts" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can update their own drafts" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can delete their own drafts" ON public.scouting_report_drafts;
DROP POLICY IF EXISTS "Scouts can create drafts" ON public.scouting_report_drafts;
