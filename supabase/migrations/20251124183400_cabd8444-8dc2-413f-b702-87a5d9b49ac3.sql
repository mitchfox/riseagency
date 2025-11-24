-- Drop restrictive policies and create one simple public read policy
DROP POLICY IF EXISTS "Anyone can view player images" ON marketing_gallery;
DROP POLICY IF EXISTS "Players can view their own marketing gallery" ON marketing_gallery;
DROP POLICY IF EXISTS "Staff can view marketing gallery" ON marketing_gallery;

-- Create single public read policy - EVERYONE can see EVERYTHING
CREATE POLICY "Public can view all marketing gallery"
ON marketing_gallery
FOR SELECT
USING (true);