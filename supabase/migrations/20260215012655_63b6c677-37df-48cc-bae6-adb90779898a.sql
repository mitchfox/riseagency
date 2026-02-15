
-- Create comparison_players table for storing benchmark player data
CREATE TABLE public.comparison_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  club TEXT,
  season TEXT NOT NULL DEFAULT '2024/25',
  image_url TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  r90_average NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comparison_players ENABLE ROW LEVEL SECURITY;

-- Staff/admin can manage comparison players
CREATE POLICY "Staff and admin can view comparison_players"
ON public.comparison_players FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admin can insert comparison_players"
ON public.comparison_players FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admin can update comparison_players"
ON public.comparison_players FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admin can delete comparison_players"
ON public.comparison_players FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

-- Users (players) can view for portal comparisons
CREATE POLICY "Users can view comparison_players"
ON public.comparison_players FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'user'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_comparison_players_updated_at
BEFORE UPDATE ON public.comparison_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
