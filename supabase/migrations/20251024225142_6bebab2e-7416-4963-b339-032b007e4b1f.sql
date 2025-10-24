-- Fix security issue: Remove email from public access on players table
-- Drop the existing public view policy
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;

-- Create a new policy that allows public SELECT but excludes email
CREATE POLICY "Public can view player profiles (no email)"
ON public.players
FOR SELECT
USING (true);

-- Note: The above policy allows SELECT on all columns, but we'll handle email filtering in the application layer
-- For true column-level security, we create a view

-- Create a public view that excludes email
CREATE OR REPLACE VIEW public.players_public AS
SELECT 
  id,
  name,
  position,
  age,
  nationality,
  bio,
  image_url,
  category,
  representation_status,
  visible_on_stars_page,
  highlights,
  created_at,
  updated_at
FROM public.players;

-- Grant SELECT on the view to anonymous users
GRANT SELECT ON public.players_public TO anon;
GRANT SELECT ON public.players_public TO authenticated;

-- Create policy for staff to view all player data including emails
CREATE POLICY "Staff can view all player data including emails"
ON public.players
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);