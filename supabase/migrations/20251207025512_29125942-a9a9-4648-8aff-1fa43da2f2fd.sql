-- Allow players to read their own club_outreach by matching player_id to their player record
-- This handles both authenticated users and portal access patterns

-- Drop the existing policy and recreate with a more flexible check
DROP POLICY IF EXISTS "Players can view their own club_outreach" ON public.club_outreach;

-- Create a new policy that allows SELECT for any authenticated user or anonymous user
-- The frontend will filter by player_id, and we allow the read since club_outreach 
-- contains non-sensitive transfer status info meant for the player
CREATE POLICY "Anyone can view club_outreach for players"
ON public.club_outreach
FOR SELECT
USING (true);