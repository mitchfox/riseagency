-- Drop the restrictive policy
DROP POLICY IF EXISTS "Players can view their own marketing gallery images" ON marketing_gallery;

-- Create a public policy that allows anyone to view player images
CREATE POLICY "Anyone can view player images"
ON marketing_gallery
FOR SELECT
USING (
  category = 'players' 
  AND file_type = 'image'
);