
ALTER TABLE public.player_portal_settings
  ADD COLUMN IF NOT EXISTS vision_skillset text,
  ADD COLUMN IF NOT EXISTS vision_per90_targets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vision_roadmap jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vision_players_to_watch jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.player_operating_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_operating_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view operating profile"
  ON public.player_operating_profile FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert operating profile"
  ON public.player_operating_profile FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can update operating profile"
  ON public.player_operating_profile FOR UPDATE
  USING (true);

CREATE TRIGGER trg_player_operating_profile_updated_at
  BEFORE UPDATE ON public.player_operating_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
