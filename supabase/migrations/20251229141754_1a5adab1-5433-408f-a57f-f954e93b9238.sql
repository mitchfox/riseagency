-- Add a policy to allow unauthenticated users to check if an email exists in profiles
-- This is needed for the staff login flow to verify email before attempting authentication
CREATE POLICY "Allow email lookup for login"
ON public.profiles
FOR SELECT
USING (true);

-- Note: This only allows SELECT, not INSERT/UPDATE/DELETE
-- The existing "Users can view their own profile" and "Admins can view all profiles" policies remain