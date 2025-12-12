-- Drop the current restrictive policies on player_club_submissions
DROP POLICY IF EXISTS "Authenticated users can view player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Authenticated users can insert player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Authenticated users can update player_club_submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Authenticated users can delete player_club_submissions" ON public.player_club_submissions;

-- Create fully anonymous-access policies
CREATE POLICY "Anyone can view player_club_submissions"
ON public.player_club_submissions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert player_club_submissions"
ON public.player_club_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update player_club_submissions"
ON public.player_club_submissions
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete player_club_submissions"
ON public.player_club_submissions
FOR DELETE
USING (true);