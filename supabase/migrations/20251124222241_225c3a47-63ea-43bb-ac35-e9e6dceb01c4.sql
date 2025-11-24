-- Grant marketeers full permissions on marketing tables
DROP POLICY IF EXISTS "Marketeers can manage marketing_gallery" ON public.marketing_gallery;
CREATE POLICY "Marketeers can manage marketing_gallery"
ON public.marketing_gallery
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketeers can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Marketeers can manage marketing_campaigns"
ON public.marketing_campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketeers can manage marketing_templates" ON public.marketing_templates;
CREATE POLICY "Marketeers can manage marketing_templates"
ON public.marketing_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketeers can manage blog_posts" ON public.blog_posts;
CREATE POLICY "Marketeers can manage blog_posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketeers can manage club_network_contacts" ON public.club_network_contacts;
CREATE POLICY "Marketeers can manage club_network_contacts"
ON public.club_network_contacts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

-- Grant marketeers view access to form submissions and scouting reports
DROP POLICY IF EXISTS "Marketeers can view form_submissions" ON public.form_submissions;
CREATE POLICY "Marketeers can view form_submissions"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketeers can view scouting_reports" ON public.scouting_reports;
CREATE POLICY "Marketeers can view scouting_reports"
ON public.scouting_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'marketeer') OR public.has_role(auth.uid(), 'admin'));