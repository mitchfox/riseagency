-- Add a policy to allow unauthenticated users to check roles during login
-- This is needed for the staff login flow to verify user has staff/admin role
CREATE POLICY "Allow role lookup for login"
ON public.user_roles
FOR SELECT
USING (true);