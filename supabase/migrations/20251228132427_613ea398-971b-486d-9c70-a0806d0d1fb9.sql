-- Add policy to allow anonymous users to check scout email for login
CREATE POLICY "Allow anonymous login check"
ON public.scouts
FOR SELECT
USING (true);

-- Drop the old scout self-view policy since the new one covers it
DROP POLICY IF EXISTS "Scouts can view their own record" ON public.scouts;