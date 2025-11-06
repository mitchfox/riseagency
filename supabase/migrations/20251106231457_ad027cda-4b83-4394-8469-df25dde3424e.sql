-- Grant marketeer access to Network & Recruitment tables
-- Club network contacts
CREATE POLICY "Marketeers can manage club network contacts"
ON public.club_network_contacts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role))
WITH CHECK (has_role(auth.uid(), 'marketeer'::app_role));

-- Prospects
CREATE POLICY "Marketeers can manage prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role))
WITH CHECK (has_role(auth.uid(), 'marketeer'::app_role));

-- Grant marketeer access to Marketing & Brand tables
-- Marketing gallery
CREATE POLICY "Marketeers can manage marketing gallery"
ON public.marketing_gallery
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role))
WITH CHECK (has_role(auth.uid(), 'marketeer'::app_role));

-- Marketing templates
CREATE POLICY "Marketeers can manage marketing templates"
ON public.marketing_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role))
WITH CHECK (has_role(auth.uid(), 'marketeer'::app_role));

-- Blog posts
CREATE POLICY "Marketeers can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role))
WITH CHECK (has_role(auth.uid(), 'marketeer'::app_role));

-- Grant marketeer view access to form submissions (for recruitment)
CREATE POLICY "Marketeers can view form submissions"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role));

-- Grant marketeer view access to site visits (for overview)
CREATE POLICY "Marketeers can view site visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role));

-- Grant marketeer view access to players (public data only, for overview)
CREATE POLICY "Marketeers can view player profiles"
ON public.players
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'marketeer'::app_role));