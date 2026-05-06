
-- player_hudl_visibility: control which playlists/clips show on Stars page
CREATE TABLE IF NOT EXISTS public.player_hudl_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL,
  clip_id TEXT,
  clip_video_url TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_hudl_visibility_player ON public.player_hudl_visibility(player_id);
CREATE INDEX IF NOT EXISTS idx_player_hudl_visibility_playlist ON public.player_hudl_visibility(playlist_id);

ALTER TABLE public.player_hudl_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hudl visibility" ON public.player_hudl_visibility;
CREATE POLICY "Anyone can view hudl visibility"
ON public.player_hudl_visibility FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Staff can manage hudl visibility" ON public.player_hudl_visibility;
CREATE POLICY "Staff can manage hudl visibility"
ON public.player_hudl_visibility FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_player_hudl_visibility_updated_at ON public.player_hudl_visibility;
CREATE TRIGGER update_player_hudl_visibility_updated_at
BEFORE UPDATE ON public.player_hudl_visibility
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- player_form_config: which form stats to show on Stars profile and the window
CREATE TABLE IF NOT EXISTS public.player_form_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  window_size INTEGER NOT NULL DEFAULT 5,
  stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_form_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view form config" ON public.player_form_config;
CREATE POLICY "Anyone can view form config"
ON public.player_form_config FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Staff can manage form config" ON public.player_form_config;
CREATE POLICY "Staff can manage form config"
ON public.player_form_config FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_player_form_config_updated_at ON public.player_form_config;
CREATE TRIGGER update_player_form_config_updated_at
BEFORE UPDATE ON public.player_form_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
