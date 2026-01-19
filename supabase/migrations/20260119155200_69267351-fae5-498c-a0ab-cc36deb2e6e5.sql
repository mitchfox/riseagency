-- Allow public read access to analyses
-- This enables viewing analysis from both staff and portal without strict auth
CREATE POLICY "Allow public read access to analyses"
ON public.analyses
FOR SELECT
USING (true);