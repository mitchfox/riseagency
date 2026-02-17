
-- Drop existing restrictive policies and replace with open ones for player_analysis
DROP POLICY IF EXISTS "Admin can manage all analysis" ON public.player_analysis;
DROP POLICY IF EXISTS "Anyone can view player analysis" ON public.player_analysis;
DROP POLICY IF EXISTS "Staff can manage player analysis" ON public.player_analysis;
DROP POLICY IF EXISTS "Staff can manage player_analysis" ON public.player_analysis;
DROP POLICY IF EXISTS "Staff can view all analysis" ON public.player_analysis;

CREATE POLICY "Allow all access to player_analysis"
ON public.player_analysis FOR ALL
USING (true)
WITH CHECK (true);

-- Drop existing restrictive policies and replace with open ones for analyses
DROP POLICY IF EXISTS "Admin can manage analyses" ON public.analyses;
DROP POLICY IF EXISTS "Allow public read access to analyses" ON public.analyses;
DROP POLICY IF EXISTS "Players can view their linked analyses" ON public.analyses;
DROP POLICY IF EXISTS "Staff can manage analyses" ON public.analyses;
DROP POLICY IF EXISTS "Staff can view analyses" ON public.analyses;

CREATE POLICY "Allow all access to analyses"
ON public.analyses FOR ALL
USING (true)
WITH CHECK (true);

-- Drop existing restrictive policies and replace with open ones for fixtures
DROP POLICY IF EXISTS "Admin can manage all fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Anyone can view fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Staff can manage fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Staff can view all fixtures" ON public.fixtures;

CREATE POLICY "Allow all access to fixtures"
ON public.fixtures FOR ALL
USING (true)
WITH CHECK (true);

-- Drop existing restrictive policies and replace with open ones for player_fixtures
DROP POLICY IF EXISTS "Admin can manage player fixtures" ON public.player_fixtures;
DROP POLICY IF EXISTS "Players can view their own fixtures" ON public.player_fixtures;
DROP POLICY IF EXISTS "Staff can manage player_fixtures" ON public.player_fixtures;
DROP POLICY IF EXISTS "Staff can view player fixtures" ON public.player_fixtures;

CREATE POLICY "Allow all access to player_fixtures"
ON public.player_fixtures FOR ALL
USING (true)
WITH CHECK (true);
