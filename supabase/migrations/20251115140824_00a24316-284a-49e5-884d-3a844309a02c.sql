-- Create scouting reports table
CREATE TABLE public.scouting_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  age INTEGER,
  position TEXT,
  current_club TEXT,
  nationality TEXT,
  date_of_birth DATE,
  height_cm INTEGER,
  preferred_foot TEXT,
  scout_name TEXT,
  scouting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  competition TEXT,
  match_context TEXT,
  overall_rating NUMERIC CHECK (overall_rating >= 0 AND overall_rating <= 10),
  technical_rating NUMERIC CHECK (technical_rating >= 0 AND technical_rating <= 10),
  physical_rating NUMERIC CHECK (physical_rating >= 0 AND physical_rating <= 10),
  tactical_rating NUMERIC CHECK (tactical_rating >= 0 AND tactical_rating <= 10),
  mental_rating NUMERIC CHECK (mental_rating >= 0 AND mental_rating <= 10),
  strengths TEXT,
  weaknesses TEXT,
  summary TEXT,
  potential_assessment TEXT,
  recommendation TEXT,
  video_url TEXT,
  profile_image_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  agent_name TEXT,
  agent_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'recommended', 'rejected', 'monitoring')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  added_to_prospects BOOLEAN DEFAULT FALSE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage scouting reports"
ON public.scouting_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage scouting reports"
ON public.scouting_reports
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Marketeers can view scouting reports"
ON public.scouting_reports
FOR SELECT
USING (has_role(auth.uid(), 'marketeer'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_scouting_reports_updated_at
BEFORE UPDATE ON public.scouting_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_scouting_reports_status ON public.scouting_reports(status);
CREATE INDEX idx_scouting_reports_priority ON public.scouting_reports(priority);
CREATE INDEX idx_scouting_reports_scouting_date ON public.scouting_reports(scouting_date DESC);
CREATE INDEX idx_scouting_reports_prospect_id ON public.scouting_reports(prospect_id);