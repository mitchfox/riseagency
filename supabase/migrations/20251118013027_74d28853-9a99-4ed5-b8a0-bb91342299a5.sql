-- Drop the problematic policy
DROP POLICY IF EXISTS "Players can view their own marketing gallery images" ON marketing_gallery;

-- Create security definer function to get player name
CREATE OR REPLACE FUNCTION public.get_player_name_by_email(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name 
  FROM players 
  WHERE email = _email
  LIMIT 1;
$$;

-- Create better RLS policy using the function
CREATE POLICY "Players can view their own marketing gallery images"
ON marketing_gallery
FOR SELECT
USING (
  category = 'players' 
  AND file_type = 'image'
  AND title ILIKE '%' || get_player_name_by_email((auth.jwt() ->> 'email')::text) || '%'
);