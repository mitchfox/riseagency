-- Allow public access to player_analysis when querying by player_id
-- This enables the player portal to work without authentication
DROP POLICY IF EXISTS "Players can view their own analysis" ON player_analysis;
CREATE POLICY "Players can view their own analysis" 
ON player_analysis 
FOR SELECT 
TO public
USING (true);

-- Keep staff management policy
-- (Staff can manage all analysis policy already exists)

-- Update player_programs policy to allow public access
DROP POLICY IF EXISTS "Players can view their own programs" ON player_programs;
CREATE POLICY "Players can view their own programs" 
ON player_programs 
FOR SELECT 
TO public
USING (true);

-- Keep staff management policy
-- (Staff can manage all programs policy already exists)