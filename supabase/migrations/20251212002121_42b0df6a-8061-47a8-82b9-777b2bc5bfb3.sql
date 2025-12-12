-- Drop existing INSERT policy that may have issues
DROP POLICY IF EXISTS "Players can insert their own submissions" ON public.player_club_submissions;

-- Create a new INSERT policy that properly checks player ownership
-- Using a simpler approach that doesn't cause auth.users permission issues
CREATE POLICY "Players can insert their own submissions" 
ON public.player_club_submissions 
FOR INSERT 
WITH CHECK (
  player_id IN (
    SELECT id FROM public.players 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);