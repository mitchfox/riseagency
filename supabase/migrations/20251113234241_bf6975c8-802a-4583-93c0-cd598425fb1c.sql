-- Drop the existing player view policy
DROP POLICY IF EXISTS "Players can view their own playlists" ON public.playlists;

-- Create a new policy that allows anyone to view playlists
CREATE POLICY "Anyone can view playlists"
ON public.playlists
FOR SELECT
USING (true);