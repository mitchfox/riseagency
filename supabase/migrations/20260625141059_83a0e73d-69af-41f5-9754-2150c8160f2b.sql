
-- Phase 1: Close anon write access on staff-internal tables.
-- Strategy: replace each "Allow all access" {public} ALL policy with an
-- equivalent {authenticated} ALL policy. Any logged-in staff/player user
-- keeps full read/write; only fully anonymous internet callers lose access.

-- analyses
DROP POLICY IF EXISTS "Allow all access to analyses" ON public.analyses;
CREATE POLICY "Authenticated full access to analyses"
  ON public.analyses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- fixtures
DROP POLICY IF EXISTS "Allow all access to fixtures" ON public.fixtures;
CREATE POLICY "Authenticated full access to fixtures"
  ON public.fixtures FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- player_fixtures
DROP POLICY IF EXISTS "Allow all access to player_fixtures" ON public.player_fixtures;
CREATE POLICY "Authenticated full access to player_fixtures"
  ON public.player_fixtures FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- player_analysis (performance reports)
DROP POLICY IF EXISTS "Allow all access to player_analysis" ON public.player_analysis;
CREATE POLICY "Authenticated full access to player_analysis"
  ON public.player_analysis FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- player_seasons
DROP POLICY IF EXISTS "Allow all access to player_seasons" ON public.player_seasons;
DROP POLICY IF EXISTS "Open select for authenticated player_seasons" ON public.player_seasons;
CREATE POLICY "Authenticated full access to player_seasons"
  ON public.player_seasons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- marketing_schedule_items
DROP POLICY IF EXISTS "Allow all access to marketing_schedule_items" ON public.marketing_schedule_items;
CREATE POLICY "Authenticated full access to marketing_schedule_items"
  ON public.marketing_schedule_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- messaging_scripts
DROP POLICY IF EXISTS "Open scripts select" ON public.messaging_scripts;
DROP POLICY IF EXISTS "Open scripts insert" ON public.messaging_scripts;
DROP POLICY IF EXISTS "Open scripts update" ON public.messaging_scripts;
DROP POLICY IF EXISTS "Open scripts delete" ON public.messaging_scripts;
CREATE POLICY "Authenticated full access to messaging_scripts"
  ON public.messaging_scripts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- messaging_script_nodes
DROP POLICY IF EXISTS "Open script_nodes select" ON public.messaging_script_nodes;
DROP POLICY IF EXISTS "Open script_nodes insert" ON public.messaging_script_nodes;
DROP POLICY IF EXISTS "Open script_nodes update" ON public.messaging_script_nodes;
DROP POLICY IF EXISTS "Open script_nodes delete" ON public.messaging_script_nodes;
CREATE POLICY "Authenticated full access to messaging_script_nodes"
  ON public.messaging_script_nodes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- messaging_script_objections
DROP POLICY IF EXISTS "Open objections select" ON public.messaging_script_objections;
DROP POLICY IF EXISTS "Open objections insert" ON public.messaging_script_objections;
DROP POLICY IF EXISTS "Open objections update" ON public.messaging_script_objections;
DROP POLICY IF EXISTS "Open objections delete" ON public.messaging_script_objections;
CREATE POLICY "Authenticated full access to messaging_script_objections"
  ON public.messaging_script_objections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- outreach_strategy_staging
DROP POLICY IF EXISTS "stage_anon_all" ON public.outreach_strategy_staging;
-- keep stage_auth_all (authenticated) and stage_sandbox_all as-is
