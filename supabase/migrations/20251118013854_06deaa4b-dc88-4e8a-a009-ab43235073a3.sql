-- Drop the problematic policy
DROP POLICY IF EXISTS "Players can view their own marketing gallery images" ON marketing_gallery;

-- Create a simpler, more direct RLS policy
-- This checks if the logged-in user's email matches a player, and that player's ID matches the image's player_id
CREATE POLICY "Players can view their own marketing gallery images"
ON marketing_gallery
FOR SELECT
USING (
  category = 'players' 
  AND file_type = 'image'
  AND player_id = (
    SELECT p.id 
    FROM players p 
    WHERE p.email = (auth.jwt() ->> 'email')::text
    LIMIT 1
  )
);