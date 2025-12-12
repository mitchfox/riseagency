-- Loosen player-specific policies on player_club_submissions to work with current player portal auth

DROP POLICY IF EXISTS "Players can view their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can insert their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can update their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can delete their own submissions" ON public.player_club_submissions;

-- Allow any authenticated user to manage player_club_submissions rows
CREATE POLICY "Authenticated users can view player_club_submissions" 
ON public.player_club_submissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert player_club_submissions" 
ON public.player_club_submissions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update player_club_submissions" 
ON public.player_club_submissions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete player_club_submissions" 
ON public.player_club_submissions
FOR DELETE
USING (auth.uid() IS NOT NULL);