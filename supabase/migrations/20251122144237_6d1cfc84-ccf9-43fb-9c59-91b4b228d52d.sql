-- Set up configuration parameters for edge function notifications
-- These are used by triggers to call edge functions

-- Create a function to safely set configuration parameters
CREATE OR REPLACE FUNCTION public.setup_app_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We'll use environment variables from the edge function context instead
  -- This is a placeholder function for future use if needed
  NULL;
END;
$$;

-- Update existing notification functions to use Deno.env style access
-- These functions will be called by triggers but won't make HTTP calls
-- Instead, we'll handle notifications through edge functions directly

-- Recreate notify_new_player_analysis without the HTTP call
CREATE OR REPLACE FUNCTION public.notify_new_player_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without making HTTP calls
  -- Notifications will be handled by the application layer
  RETURN NEW;
END;
$$;

-- Recreate notify_new_program without the HTTP call
CREATE OR REPLACE FUNCTION public.notify_new_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without making HTTP calls
  -- Notifications will be handled by the application layer
  RETURN NEW;
END;
$$;

-- Recreate notify_new_update without the HTTP call
CREATE OR REPLACE FUNCTION public.notify_new_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without making HTTP calls
  -- Notifications will be handled by the application layer
  RETURN NEW;
END;
$$;

-- Recreate notify_new_concept without the HTTP call
CREATE OR REPLACE FUNCTION public.notify_new_concept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without making HTTP calls
  -- Notifications will be handled by the application layer
  RETURN NEW;
END;
$$;