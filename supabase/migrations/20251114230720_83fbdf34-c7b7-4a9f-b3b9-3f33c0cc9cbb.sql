-- Add explicit deny-all policy for push_config table
-- This table should only be accessed via edge functions using service role
CREATE POLICY "Deny all access to push_config"
  ON public.push_config
  FOR ALL
  USING (false);