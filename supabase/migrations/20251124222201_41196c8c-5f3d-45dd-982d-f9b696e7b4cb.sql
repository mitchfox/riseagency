-- Grant staff full permissions on player-related tables
DROP POLICY IF EXISTS "Staff can manage players" ON public.players;
CREATE POLICY "Staff can manage players"
ON public.players
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_analysis" ON public.player_analysis;
CREATE POLICY "Staff can manage player_analysis"
ON public.player_analysis
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_programs" ON public.player_programs;
CREATE POLICY "Staff can manage player_programs"
ON public.player_programs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_stats" ON public.player_stats;
CREATE POLICY "Staff can manage player_stats"
ON public.player_stats
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_fixtures" ON public.player_fixtures;
CREATE POLICY "Staff can manage player_fixtures"
ON public.player_fixtures
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_other_analysis" ON public.player_other_analysis;
CREATE POLICY "Staff can manage player_other_analysis"
ON public.player_other_analysis
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on analysis tables
DROP POLICY IF EXISTS "Staff can manage analyses" ON public.analyses;
CREATE POLICY "Staff can manage analyses"
ON public.analyses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage performance_report_actions" ON public.performance_report_actions;
CREATE POLICY "Staff can manage performance_report_actions"
ON public.performance_report_actions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage analysis_point_examples" ON public.analysis_point_examples;
CREATE POLICY "Staff can manage analysis_point_examples"
ON public.analysis_point_examples
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on coaching tables
DROP POLICY IF EXISTS "Staff can manage coaching_analysis" ON public.coaching_analysis;
CREATE POLICY "Staff can manage coaching_analysis"
ON public.coaching_analysis
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage coaching_drills" ON public.coaching_drills;
CREATE POLICY "Staff can manage coaching_drills"
ON public.coaching_drills
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage coaching_exercises" ON public.coaching_exercises;
CREATE POLICY "Staff can manage coaching_exercises"
ON public.coaching_exercises
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage coaching_sessions" ON public.coaching_sessions;
CREATE POLICY "Staff can manage coaching_sessions"
ON public.coaching_sessions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage coaching_programmes" ON public.coaching_programmes;
CREATE POLICY "Staff can manage coaching_programmes"
ON public.coaching_programmes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage psychological_sessions" ON public.psychological_sessions;
CREATE POLICY "Staff can manage psychological_sessions"
ON public.psychological_sessions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage coaching_aphorisms" ON public.coaching_aphorisms;
CREATE POLICY "Staff can manage coaching_aphorisms"
ON public.coaching_aphorisms
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on fixtures
DROP POLICY IF EXISTS "Staff can manage fixtures" ON public.fixtures;
CREATE POLICY "Staff can manage fixtures"
ON public.fixtures
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on r90_ratings
DROP POLICY IF EXISTS "Staff can manage r90_ratings" ON public.r90_ratings;
CREATE POLICY "Staff can manage r90_ratings"
ON public.r90_ratings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage action_r90_category_mappings" ON public.action_r90_category_mappings;
CREATE POLICY "Staff can manage action_r90_category_mappings"
ON public.action_r90_category_mappings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on scouting tables
DROP POLICY IF EXISTS "Staff can manage scouting_reports" ON public.scouting_reports;
CREATE POLICY "Staff can manage scouting_reports"
ON public.scouting_reports
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage prospects" ON public.prospects;
CREATE POLICY "Staff can manage prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on marketing tables
DROP POLICY IF EXISTS "Staff can manage marketing_gallery" ON public.marketing_gallery;
CREATE POLICY "Staff can manage marketing_gallery"
ON public.marketing_gallery
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Staff can manage marketing_campaigns"
ON public.marketing_campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage marketing_templates" ON public.marketing_templates;
CREATE POLICY "Staff can manage marketing_templates"
ON public.marketing_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on blog and legal
DROP POLICY IF EXISTS "Staff can manage blog_posts" ON public.blog_posts;
CREATE POLICY "Staff can manage blog_posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage legal_documents" ON public.legal_documents;
CREATE POLICY "Staff can manage legal_documents"
ON public.legal_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on club network and outreach
DROP POLICY IF EXISTS "Staff can manage club_network_contacts" ON public.club_network_contacts;
CREATE POLICY "Staff can manage club_network_contacts"
ON public.club_network_contacts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_outreach_pro" ON public.player_outreach_pro;
CREATE POLICY "Staff can manage player_outreach_pro"
ON public.player_outreach_pro
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage player_outreach_youth" ON public.player_outreach_youth;
CREATE POLICY "Staff can manage player_outreach_youth"
ON public.player_outreach_youth
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on invoices and templates
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
CREATE POLICY "Staff can manage invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can manage email_templates" ON public.email_templates;
CREATE POLICY "Staff can manage email_templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on playlists
DROP POLICY IF EXISTS "Staff can manage playlists" ON public.playlists;
CREATE POLICY "Staff can manage playlists"
ON public.playlists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on notification preferences
DROP POLICY IF EXISTS "Staff can manage notification_preferences" ON public.notification_preferences;
CREATE POLICY "Staff can manage notification_preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Grant staff full permissions on performance statistics
DROP POLICY IF EXISTS "Staff can manage performance_statistics" ON public.performance_statistics;
CREATE POLICY "Staff can manage performance_statistics"
ON public.performance_statistics
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));