-- Properly fix the SECURITY DEFINER view by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.players_public;
CREATE OR REPLACE VIEW public.players_public 
WITH (security_invoker = true)
AS
SELECT id, name, "position", age, nationality, bio, image_url, 
       category, representation_status, visible_on_stars_page, 
       highlights, created_at, updated_at
FROM players;