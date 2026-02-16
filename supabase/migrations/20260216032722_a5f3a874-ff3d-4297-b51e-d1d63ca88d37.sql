
-- 1. Player Goals
CREATE TABLE public.player_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.player_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own goals"
  ON public.player_goals FOR SELECT
  USING (true);

CREATE POLICY "Players can insert their own goals"
  ON public.player_goals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own goals"
  ON public.player_goals FOR UPDATE
  USING (true);

CREATE POLICY "Players can delete their own goals"
  ON public.player_goals FOR DELETE
  USING (true);

CREATE UNIQUE INDEX idx_player_goals_unique ON public.player_goals (player_id, metric_key);

CREATE TRIGGER update_player_goals_updated_at
  BEFORE UPDATE ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Player Injury Log
CREATE TABLE public.player_injury_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  body_area TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.player_injury_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view injury logs"
  ON public.player_injury_log FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert injury logs"
  ON public.player_injury_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update injury logs"
  ON public.player_injury_log FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete injury logs"
  ON public.player_injury_log FOR DELETE
  USING (true);

CREATE INDEX idx_injury_log_player ON public.player_injury_log (player_id);

-- 3. Staff Activity Log
CREATE TABLE public.staff_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON public.staff_activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert activity log"
  ON public.staff_activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_activity_log_created ON public.staff_activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.staff_activity_log (entity_type);

-- 4. Video Analyses
CREATE TABLE public.video_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  player_id TEXT,
  match_date DATE,
  opponent TEXT,
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view video analyses"
  ON public.video_analyses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert video analyses"
  ON public.video_analyses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update video analyses"
  ON public.video_analyses FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete video analyses"
  ON public.video_analyses FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_video_analyses_updated_at
  BEFORE UPDATE ON public.video_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Periodisation Plans
CREATE TABLE public.periodisation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  season TEXT NOT NULL DEFAULT '2024/25',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.periodisation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view periodisation plans"
  ON public.periodisation_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert periodisation plans"
  ON public.periodisation_plans FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update periodisation plans"
  ON public.periodisation_plans FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete periodisation plans"
  ON public.periodisation_plans FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE UNIQUE INDEX idx_periodisation_player_season ON public.periodisation_plans (player_id, season);

CREATE TRIGGER update_periodisation_plans_updated_at
  BEFORE UPDATE ON public.periodisation_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
