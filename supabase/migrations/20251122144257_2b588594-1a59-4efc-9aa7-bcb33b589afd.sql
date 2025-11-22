-- Fix security warning: Add search_path to the setup function
CREATE OR REPLACE FUNCTION public.setup_app_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Placeholder function for future use if needed
  NULL;
END;
$$;