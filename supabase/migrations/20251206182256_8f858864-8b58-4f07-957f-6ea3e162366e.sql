-- Drop and recreate player policies to ensure they work correctly for INSERT/UPDATE/DELETE

-- First, drop the existing player policy that might have issues
DROP POLICY IF EXISTS "Players can manage their own submissions" ON public.player_club_submissions;

-- Create explicit policies for each operation to ensure they work

-- SELECT policy for players
CREATE POLICY "Players can view their own submissions"
ON public.player_club_submissions
FOR SELECT
TO authenticated
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
  )
);

-- INSERT policy for players - must match the player_id they're inserting
CREATE POLICY "Players can insert their own submissions"
ON public.player_club_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
  )
);

-- UPDATE policy for players
CREATE POLICY "Players can update their own submissions"
ON public.player_club_submissions
FOR UPDATE
TO authenticated
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
  )
);

-- DELETE policy for players
CREATE POLICY "Players can delete their own submissions"
ON public.player_club_submissions
FOR DELETE
TO authenticated
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
  )
);