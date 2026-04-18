CREATE POLICY "Public can view annotation projects"
ON public.annotation_projects FOR SELECT
TO anon
USING (true);