-- Drop existing player insert policy and recreate with correct check
DROP POLICY IF EXISTS "Players can insert their own test results" ON public.player_test_results;

-- Recreate with proper check using auth.jwt()
CREATE POLICY "Players can insert their own test results"
ON public.player_test_results
FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT p.id FROM players p WHERE p.email = (auth.jwt() ->> 'email')
  )
);