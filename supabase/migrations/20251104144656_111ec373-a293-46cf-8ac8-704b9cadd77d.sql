-- Update RLS policies to separate admin (full access) from staff (view-only)

-- analyses table
DROP POLICY IF EXISTS "Staff can manage analyses" ON analyses;
CREATE POLICY "Staff can view analyses" ON analyses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage analyses" ON analyses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- blog_posts table
DROP POLICY IF EXISTS "Staff can manage blog posts" ON blog_posts;
CREATE POLICY "Staff can view blog posts" ON blog_posts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage blog posts" ON blog_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_analysis table
DROP POLICY IF EXISTS "Staff can manage coaching analysis" ON coaching_analysis;
CREATE POLICY "Staff can view coaching analysis" ON coaching_analysis FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage coaching analysis" ON coaching_analysis FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_aphorisms table
DROP POLICY IF EXISTS "Staff can manage aphorisms" ON coaching_aphorisms;
CREATE POLICY "Staff can view aphorisms" ON coaching_aphorisms FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage aphorisms" ON coaching_aphorisms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_drills table
DROP POLICY IF EXISTS "Staff can manage coaching drills" ON coaching_drills;
CREATE POLICY "Staff can view coaching drills" ON coaching_drills FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage coaching drills" ON coaching_drills FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_exercises table
DROP POLICY IF EXISTS "Staff can manage coaching exercises" ON coaching_exercises;
CREATE POLICY "Staff can view coaching exercises" ON coaching_exercises FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage coaching exercises" ON coaching_exercises FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_programmes table
DROP POLICY IF EXISTS "Staff can manage coaching programmes" ON coaching_programmes;
CREATE POLICY "Staff can view coaching programmes" ON coaching_programmes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage coaching programmes" ON coaching_programmes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- coaching_sessions table
DROP POLICY IF EXISTS "Staff can manage coaching sessions" ON coaching_sessions;
CREATE POLICY "Staff can view coaching sessions" ON coaching_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage coaching sessions" ON coaching_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- email_templates table
DROP POLICY IF EXISTS "Staff can manage email templates" ON email_templates;
CREATE POLICY "Staff can view email templates" ON email_templates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage email templates" ON email_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- fixtures table
DROP POLICY IF EXISTS "Staff can manage all fixtures" ON fixtures;
CREATE POLICY "Staff can view all fixtures" ON fixtures FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all fixtures" ON fixtures FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- invoices table
DROP POLICY IF EXISTS "Staff can manage all invoices" ON invoices;
CREATE POLICY "Staff can view all invoices" ON invoices FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all invoices" ON invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- marketing_templates table
DROP POLICY IF EXISTS "Staff can manage marketing templates" ON marketing_templates;
CREATE POLICY "Staff can view marketing templates" ON marketing_templates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage marketing templates" ON marketing_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- performance_report_actions table
DROP POLICY IF EXISTS "Staff can manage all performance report actions" ON performance_report_actions;
CREATE POLICY "Staff can view all performance report actions" ON performance_report_actions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all performance report actions" ON performance_report_actions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- player_analysis table
DROP POLICY IF EXISTS "Staff can manage all analysis" ON player_analysis;
CREATE POLICY "Staff can view all analysis" ON player_analysis FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all analysis" ON player_analysis FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- player_fixtures table
DROP POLICY IF EXISTS "Staff can manage player fixtures" ON player_fixtures;
CREATE POLICY "Staff can view player fixtures" ON player_fixtures FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage player fixtures" ON player_fixtures FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- player_programs table
DROP POLICY IF EXISTS "Staff can manage all programs" ON player_programs;
CREATE POLICY "Staff can view all programs" ON player_programs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all programs" ON player_programs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- player_stats table
DROP POLICY IF EXISTS "Staff can manage player stats" ON player_stats;
CREATE POLICY "Staff can view player stats" ON player_stats FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage player stats" ON player_stats FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- players table
DROP POLICY IF EXISTS "Staff can insert players" ON players;
DROP POLICY IF EXISTS "Staff can update players" ON players;
DROP POLICY IF EXISTS "Staff can delete players" ON players;
CREATE POLICY "Admin can insert players" ON players FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update players" ON players FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete players" ON players FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- prospects table
DROP POLICY IF EXISTS "Staff can manage prospects" ON prospects;
CREATE POLICY "Staff can view prospects" ON prospects FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage prospects" ON prospects FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- psychological_sessions table
DROP POLICY IF EXISTS "Staff can manage psychological sessions" ON psychological_sessions;
CREATE POLICY "Staff can view psychological sessions" ON psychological_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage psychological sessions" ON psychological_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- site_visits table
DROP POLICY IF EXISTS "Staff can update site visits" ON site_visits;
CREATE POLICY "Admin can update site visits" ON site_visits FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- updates table
DROP POLICY IF EXISTS "Staff can manage all updates" ON updates;
CREATE POLICY "Staff can view all updates" ON updates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all updates" ON updates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));