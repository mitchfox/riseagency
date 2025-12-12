-- Drop the existing INSERT policy that references auth.users table
DROP POLICY IF EXISTS "Players can insert their own submissions" ON public.player_club_submissions;

-- Recreate the INSERT policy using auth.jwt() instead of querying auth.users
CREATE POLICY "Players can insert their own submissions" 
ON public.player_club_submissions 
FOR INSERT 
WITH CHECK (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
  )
);