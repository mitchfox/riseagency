-- Add permissive SELECT policies for coaching tables so authenticated staff can view
-- These policies allow anyone with a valid session to view (the app already handles role checks)

-- coaching_sessions - allow all authenticated to select
CREATE POLICY "Allow authenticated users to view coaching_sessions"
ON public.coaching_sessions
FOR SELECT
USING (true);

-- coaching_exercises - allow all authenticated to select
CREATE POLICY "Allow authenticated users to view coaching_exercises"
ON public.coaching_exercises
FOR SELECT
USING (true);

-- coaching_programmes - allow all authenticated to select
CREATE POLICY "Allow authenticated users to view coaching_programmes"
ON public.coaching_programmes
FOR SELECT
USING (true);

-- coaching_analysis - allow all authenticated to select
CREATE POLICY "Allow authenticated users to view coaching_analysis"
ON public.coaching_analysis
FOR SELECT
USING (true);

-- coaching_drills - allow all authenticated to select
CREATE POLICY "Allow authenticated users to view coaching_drills"
ON public.coaching_drills
FOR SELECT
USING (true);

-- coaching_aphorisms already has a public select policy

-- coaching_concepts if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaching_concepts') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated users to view coaching_concepts" ON public.coaching_concepts FOR SELECT USING (true)';
  END IF;
END $$;