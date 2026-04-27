DROP POLICY IF EXISTS "Users can update their own annotation projects" ON public.annotation_projects;
DROP POLICY IF EXISTS "Users can delete their own annotation projects" ON public.annotation_projects;

CREATE POLICY "Authenticated can update annotation projects"
ON public.annotation_projects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated can delete annotation projects"
ON public.annotation_projects
FOR DELETE
TO authenticated
USING (true);