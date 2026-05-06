-- Relax player_hudl_visibility.playlist_id so it can store action-type group keys
-- (e.g. "best_actions", "flick_on") instead of being limited to UUIDs.
ALTER TABLE public.player_hudl_visibility
  ALTER COLUMN playlist_id DROP NOT NULL,
  ALTER COLUMN playlist_id TYPE text USING playlist_id::text;

-- Add a normalised key column for action-type/category storage (used by new code)
ALTER TABLE public.player_hudl_visibility
  ADD COLUMN IF NOT EXISTS playlist_key text;

CREATE INDEX IF NOT EXISTS idx_player_hudl_visibility_playlist_key
  ON public.player_hudl_visibility(playlist_key);