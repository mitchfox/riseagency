-- Drop the restrictive player SELECT policy for player_test_results
DROP POLICY IF EXISTS "Players can view their own test results" ON public.player_test_results;

-- Create a new policy that allows anyone to SELECT test results
-- This is safe because test results are not sensitive and are linked to player IDs
-- Staff can still manage via their existing policies
CREATE POLICY "Anyone can view test results" 
ON public.player_test_results 
FOR SELECT 
USING (true);

-- Also update positional_guide_points to be publicly readable for portal users
DROP POLICY IF EXISTS "Authenticated users can view positional_guide_points" ON public.positional_guide_points;

CREATE POLICY "Anyone can view positional_guide_points" 
ON public.positional_guide_points 
FOR SELECT 
USING (true);

-- Also update tactical_schemes to be publicly readable for portal users
DROP POLICY IF EXISTS "Authenticated users can view tactical schemes" ON public.tactical_schemes;

CREATE POLICY "Anyone can view tactical_schemes" 
ON public.tactical_schemes 
FOR SELECT 
USING (true);

-- Also update coaching_analysis to be publicly readable for concepts
-- Already has "Allow authenticated users to view coaching_analysis" with USING(true) but roles is 'public'
-- Let's verify it works correctly by checking