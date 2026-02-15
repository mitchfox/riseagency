
-- Fix: Portal players aren't authenticated via Supabase auth, they use anon key
-- Allow anyone authenticated OR anon to read comparison_players (public benchmark data)
DROP POLICY IF EXISTS "Users can view comparison_players" ON public.comparison_players;

CREATE POLICY "Anyone can view comparison_players"
ON public.comparison_players
FOR SELECT
TO anon, authenticated
USING (true);

-- Add fixture_stats JSONB column to player_analysis for per-game metric tracking
-- This stores the 40 comparison metrics per fixture for averaging
ALTER TABLE public.player_analysis ADD COLUMN IF NOT EXISTS fixture_stats JSONB DEFAULT '{}'::jsonb;
