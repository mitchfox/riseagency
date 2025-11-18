-- Add player_id column to marketing_gallery
ALTER TABLE marketing_gallery 
ADD COLUMN player_id uuid REFERENCES players(id) ON DELETE SET NULL;

-- Update existing records to link them to players based on title
UPDATE marketing_gallery mg
SET player_id = p.id
FROM players p
WHERE mg.category = 'players' 
  AND mg.file_type = 'image'
  AND mg.title ILIKE '%' || p.name || '%';

-- Drop the problematic text-matching policy
DROP POLICY IF EXISTS "Players can view their own marketing gallery images" ON marketing_gallery;

-- Create new RLS policy using direct player_id matching
CREATE POLICY "Players can view their own marketing gallery images"
ON marketing_gallery
FOR SELECT
USING (
  category = 'players' 
  AND file_type = 'image'
  AND player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')::text
  )
);