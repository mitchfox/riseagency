-- Create analyses table for pre-match, post-match, and concept analyses
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('pre-match', 'post-match', 'concept')),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Pre-match specific fields
  home_team TEXT,
  away_team TEXT,
  key_details TEXT,
  opposition_strengths TEXT,
  opposition_weaknesses TEXT,
  matchups JSONB DEFAULT '[]'::jsonb,
  scheme_title TEXT,
  scheme_paragraph_1 TEXT,
  scheme_paragraph_2 TEXT,
  scheme_image_url TEXT,
  
  -- Post-match specific fields
  player_image_url TEXT,
  strengths_improvements TEXT,
  
  -- Concept specific fields
  concept TEXT,
  explanation TEXT,
  
  -- Common fields for points/sections
  points JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Staff can manage all analyses
CREATE POLICY "Staff can manage analyses"
ON public.analyses
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add analysis_writer_id column to player_analysis to link to analyses table
ALTER TABLE public.player_analysis
ADD COLUMN analysis_writer_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL;

-- Now create policy that references the new column
CREATE POLICY "Players can view their linked analyses"
ON public.analyses
FOR SELECT
USING (
  id IN (
    SELECT analysis_writer_id 
    FROM player_analysis 
    WHERE player_id IN (
      SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
    )
    AND analysis_writer_id IS NOT NULL
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_analyses_updated_at
BEFORE UPDATE ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();