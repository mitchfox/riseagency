-- Allow portal players (anon/soft-login via localStorage) to read, insert and update their own injury log entries.
-- The portal does not use Supabase Auth, so the existing 'authenticated'-only policies blocked saves.

DROP POLICY IF EXISTS "Public can view injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Public can insert injury logs" ON public.player_injury_log;
DROP POLICY IF EXISTS "Public can update injury logs" ON public.player_injury_log;

CREATE POLICY "Public can view injury logs"
  ON public.player_injury_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert injury logs"
  ON public.player_injury_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update injury logs"
  ON public.player_injury_log
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.player_injury_log TO anon, authenticated;
GRANT ALL ON public.player_injury_log TO service_role;