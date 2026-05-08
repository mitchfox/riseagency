
-- bank_details
DROP POLICY IF EXISTS "Open select for authenticated" ON public.bank_details;

-- corporation_tax_records: restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can view tax records" ON public.corporation_tax_records;
DROP POLICY IF EXISTS "Authenticated users can create tax records" ON public.corporation_tax_records;
DROP POLICY IF EXISTS "Authenticated users can update tax records" ON public.corporation_tax_records;
DROP POLICY IF EXISTS "Authenticated users can delete tax records" ON public.corporation_tax_records;
CREATE POLICY "Admins manage tax records" ON public.corporation_tax_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- staff_section_passwords: admin only
DROP POLICY IF EXISTS "Open select for authenticated" ON public.staff_section_passwords;
DROP POLICY IF EXISTS "Authenticated users can read section passwords" ON public.staff_section_passwords;
DROP POLICY IF EXISTS "Authenticated users can insert section passwords" ON public.staff_section_passwords;
DROP POLICY IF EXISTS "Authenticated users can update section passwords" ON public.staff_section_passwords;
DROP POLICY IF EXISTS "Authenticated users can delete section passwords" ON public.staff_section_passwords;
CREATE POLICY "Admins manage section passwords" ON public.staff_section_passwords
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- push_config: deny all (service role bypasses RLS)
DROP POLICY IF EXISTS "Open select for authenticated" ON public.push_config;

-- prospects
DROP POLICY IF EXISTS "Open select for authenticated" ON public.prospects;

-- player_outreach_youth
DROP POLICY IF EXISTS "Open select for authenticated" ON public.player_outreach_youth;

-- scouting_report_drafts
DROP POLICY IF EXISTS "Open select for authenticated" ON public.scouting_report_drafts;

-- signature_contracts
DROP POLICY IF EXISTS "Open select for authenticated" ON public.signature_contracts;
DROP POLICY IF EXISTS "Public can view active contracts by token" ON public.signature_contracts;

-- marketing_campaigns: drop public role policies (keep authenticated staff/marketeer)
DROP POLICY IF EXISTS "Staff can create campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Staff can update campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Staff can delete campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Staff can view campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.marketing_campaigns;

-- player_injury_log: drop "Anyone can..." and add staff/admin scoped + authenticated-required
DROP POLICY IF EXISTS "Anyone can view injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Anyone can insert injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Anyone can update injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Anyone can delete injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.player_injury_log;
CREATE POLICY "Authenticated can view injury logs" ON public.player_injury_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert injury logs" ON public.player_injury_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update injury logs" ON public.player_injury_log
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can delete injury logs" ON public.player_injury_log
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- player_goals
DROP POLICY IF EXISTS "Players can view their own goals" ON public.player_goals;
DROP POLICY IF EXISTS "Players can insert their own goals" ON public.player_goals;
DROP POLICY IF EXISTS "Players can update their own goals" ON public.player_goals;
DROP POLICY IF EXISTS "Players can delete their own goals" ON public.player_goals;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.player_goals;
CREATE POLICY "Authenticated can view goals" ON public.player_goals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert goals" ON public.player_goals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update goals" ON public.player_goals
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can delete goals" ON public.player_goals
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- player_club_submissions
DROP POLICY IF EXISTS "Anyone can view player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can insert player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can update player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Anyone can delete player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.player_club_submissions;
CREATE POLICY "Authenticated can view player_club_submissions" ON public.player_club_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert player_club_submissions" ON public.player_club_submissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can update player_club_submissions" ON public.player_club_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can delete player_club_submissions" ON public.player_club_submissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- invoices: drop public read; players read own by email
DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.invoices;
CREATE POLICY "Players can view their own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = invoices.player_id
        AND lower(p.email) = lower((auth.jwt() ->> 'email'))
    )
  );

-- players: drop redundant Open select for authenticated (keep public no-email policy + role-based)
DROP POLICY IF EXISTS "Open select for authenticated" ON public.players;

-- user_roles: drop the public lookup so role mappings aren't enumerable
DROP POLICY IF EXISTS "Allow role lookup for login" ON public.user_roles;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.user_roles;

-- representation_visitors: drop public update (edge function uses service role)
DROP POLICY IF EXISTS "Anyone can update their visitor row" ON public.representation_visitors;

-- scouts: drop the public select used for login (replaced by edge function)
DROP POLICY IF EXISTS "Allow anonymous login check" ON public.scouts;
DROP POLICY IF EXISTS "Open select for authenticated" ON public.scouts;
CREATE POLICY "Authenticated staff can view scouts" ON public.scouts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Make sensitive storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('signature-contracts', 'receipt-uploads');
