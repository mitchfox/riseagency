-- Phase 1: Fix the SECURITY DEFINER view (recreate with SECURITY INVOKER)
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public AS
SELECT id, name, "position", age, nationality, bio, image_url, 
       category, representation_status, visible_on_stars_page, 
       highlights, created_at, updated_at
FROM players;
-- SECURITY INVOKER is the default, ensuring RLS policies are respected

-- Phase 2: Fix the function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Phase 3: Move pg_net extension to dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;