
-- Capacity: add current headcount fields
ALTER TABLE public.investor_capacity_settings
  ADD COLUMN IF NOT EXISTS current_youth_players integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_pro_players integer NOT NULL DEFAULT 0;

-- Capacity: allow 'ongoing' player_type for tasks that don't tie to youth or pro
ALTER TABLE public.investor_capacity_allocations
  DROP CONSTRAINT IF EXISTS investor_capacity_allocations_player_type_check;
ALTER TABLE public.investor_capacity_allocations
  ADD CONSTRAINT investor_capacity_allocations_player_type_check
  CHECK (player_type = ANY (ARRAY['youth'::text, 'pro'::text, 'ongoing'::text]));

-- Player uploaded clips (highlights page Uploads tab)
CREATE TABLE IF NOT EXISTS public.player_uploaded_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  name text NOT NULL,
  video_url text NOT NULL,
  duration_seconds numeric,
  uploaded_by_maker_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_uploaded_clips_player_id
  ON public.player_uploaded_clips(player_id);

ALTER TABLE public.player_uploaded_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view uploaded clips"
  ON public.player_uploaded_clips
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage uploaded clips"
  ON public.player_uploaded_clips
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_player_uploaded_clips_updated_at
  BEFORE UPDATE ON public.player_uploaded_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
