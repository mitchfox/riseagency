-- Make player_analysis performance reports publicly readable for stars page

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.player_analysis ENABLE ROW LEVEL SECURITY;

-- Drop any existing player-focused SELECT policy that may be restrictive
DROP POLICY IF EXISTS "Players can view their own analysis" ON public.player_analysis;

-- Create a permissive policy allowing anyone to read player analysis
CREATE POLICY "Anyone can view player analysis"
ON public.player_analysis
FOR SELECT
USING (true);