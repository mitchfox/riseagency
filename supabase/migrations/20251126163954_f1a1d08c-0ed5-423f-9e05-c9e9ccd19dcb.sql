-- Create table for scouting report drafts
CREATE TABLE IF NOT EXISTS public.scouting_report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID REFERENCES public.scouts(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  position TEXT,
  age INTEGER,
  current_club TEXT,
  nationality TEXT,
  competition TEXT,
  skill_evaluations JSONB DEFAULT '[]'::jsonb,
  strengths TEXT,
  weaknesses TEXT,
  summary TEXT,
  recommendation TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scouting_report_drafts ENABLE ROW LEVEL SECURITY;

-- Scouts can view their own drafts
CREATE POLICY "Scouts can view their own drafts"
  ON public.scouting_report_drafts
  FOR SELECT
  USING (scout_id IN (
    SELECT id FROM public.scouts WHERE email = (auth.jwt() ->> 'email')
  ));

-- Scouts can create drafts
CREATE POLICY "Scouts can create drafts"
  ON public.scouting_report_drafts
  FOR INSERT
  WITH CHECK (scout_id IN (
    SELECT id FROM public.scouts WHERE email = (auth.jwt() ->> 'email')
  ));

-- Scouts can update their own drafts
CREATE POLICY "Scouts can update their own drafts"
  ON public.scouting_report_drafts
  FOR UPDATE
  USING (scout_id IN (
    SELECT id FROM public.scouts WHERE email = (auth.jwt() ->> 'email')
  ));

-- Scouts can delete their own drafts
CREATE POLICY "Scouts can delete their own drafts"
  ON public.scouting_report_drafts
  FOR DELETE
  USING (scout_id IN (
    SELECT id FROM public.scouts WHERE email = (auth.jwt() ->> 'email')
  ));

-- Staff can manage all drafts
CREATE POLICY "Staff can manage scouting_report_drafts"
  ON public.scouting_report_drafts
  FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_scouting_report_drafts_updated_at
  BEFORE UPDATE ON public.scouting_report_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();