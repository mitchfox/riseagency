-- Create highlight_projects table for saving highlight reel configurations
CREATE TABLE public.highlight_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  playlist_id UUID,
  clips JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.highlight_projects ENABLE ROW LEVEL SECURITY;

-- Staff can manage all highlight projects
CREATE POLICY "Staff can manage highlight_projects"
ON public.highlight_projects
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can view all highlight projects
CREATE POLICY "Staff can view highlight_projects"
ON public.highlight_projects
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));