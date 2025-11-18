-- Allow players to view their own marketing gallery images
CREATE POLICY "Players can view their own marketing gallery images"
ON marketing_gallery
FOR SELECT
USING (
  category = 'players' 
  AND file_type = 'image'
  AND title ILIKE '%' || (
    SELECT name 
    FROM players 
    WHERE email = (auth.jwt() ->> 'email')::text
    LIMIT 1
  ) || '%'
);