-- Fix: Allow portal players (no auth session) to read their portal settings
-- Current RLS requires auth.uid() which fails for email-based portal login
DROP POLICY IF EXISTS "Authenticated users can view portal settings" ON public.player_portal_settings;
CREATE POLICY "Anyone can view portal settings"
  ON public.player_portal_settings
  FOR SELECT
  USING (true);

-- Add before/after duration columns to sportscode for more precise clip timing
ALTER TABLE public.sportscode_action_types 
  ADD COLUMN IF NOT EXISTS default_before_seconds integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS default_after_seconds integer DEFAULT 5;

-- Migrate existing typical_duration_seconds to split before/after (roughly half each)
UPDATE public.sportscode_action_types 
SET default_before_seconds = GREATEST(2, (typical_duration_seconds / 2)::int),
    default_after_seconds = GREATEST(2, typical_duration_seconds - (typical_duration_seconds / 2)::int)
WHERE typical_duration_seconds IS NOT NULL;