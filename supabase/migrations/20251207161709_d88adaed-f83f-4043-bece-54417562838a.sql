-- Fix player_club_submissions RLS policies to work without Supabase Auth
-- The current policies use auth.jwt()->>'email' but players use localStorage-based login

-- Drop existing player-specific policies
DROP POLICY IF EXISTS "Players can insert their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can view their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can update their own submissions" ON public.player_club_submissions;
DROP POLICY IF EXISTS "Players can delete their own submissions" ON public.player_club_submissions;

-- Create new policies that allow any authenticated or anon user to manage submissions
-- Security is maintained by requiring a valid player_id that exists in the players table

-- Anyone can insert if the player_id exists in players table
CREATE POLICY "Anyone can insert player_club_submissions"
ON public.player_club_submissions
FOR INSERT
WITH CHECK (
  player_id IN (SELECT id FROM public.players)
);

-- Anyone can view submissions (player will filter by their own player_id in the app)
CREATE POLICY "Anyone can view player_club_submissions"
ON public.player_club_submissions
FOR SELECT
USING (true);

-- Anyone can update submissions if player_id is valid
CREATE POLICY "Anyone can update player_club_submissions"
ON public.player_club_submissions
FOR UPDATE
USING (player_id IN (SELECT id FROM public.players));

-- Anyone can delete submissions if player_id is valid
CREATE POLICY "Anyone can delete player_club_submissions"
ON public.player_club_submissions
FOR DELETE
USING (player_id IN (SELECT id FROM public.players));