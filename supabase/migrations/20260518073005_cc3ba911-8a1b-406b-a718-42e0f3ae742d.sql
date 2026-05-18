DROP POLICY IF EXISTS "Investor portal can view club network contacts" ON public.club_network_contacts;
CREATE POLICY "Investor portal can view club network contacts"
ON public.club_network_contacts
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Investor portal can view club ratings" ON public.club_ratings;
CREATE POLICY "Investor portal can view club ratings"
ON public.club_ratings
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Investor portal can view country network profiles" ON public.network_country_profiles;
CREATE POLICY "Investor portal can view country network profiles"
ON public.network_country_profiles
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Investor portal can view club network profiles" ON public.network_club_profiles;
CREATE POLICY "Investor portal can view club network profiles"
ON public.network_club_profiles
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Investor portal can view role network profiles" ON public.network_role_profiles;
CREATE POLICY "Investor portal can view role network profiles"
ON public.network_role_profiles
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Investor portal can view marketing templates" ON public.marketing_templates;
CREATE POLICY "Investor portal can view marketing templates"
ON public.marketing_templates
FOR SELECT
TO anon
USING (true);