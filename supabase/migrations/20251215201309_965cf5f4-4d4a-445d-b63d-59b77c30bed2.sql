-- Add RLS policy for authenticated users to view tactical schemes
CREATE POLICY "Authenticated users can view tactical schemes"
ON tactical_schemes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);