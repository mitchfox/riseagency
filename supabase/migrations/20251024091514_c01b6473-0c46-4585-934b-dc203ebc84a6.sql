-- Create player_analysis table
CREATE TABLE public.player_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  r90_score DECIMAL(4,2) NOT NULL,
  pdf_url TEXT,
  video_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.player_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy for players to view their own analysis
CREATE POLICY "Players can view their own analysis"
ON public.player_analysis
FOR SELECT
TO authenticated
USING (
  player_id IN (
    SELECT id FROM public.players WHERE email = auth.jwt() ->> 'email'
  )
);

-- Create policy for staff to manage all analysis
CREATE POLICY "Staff can manage all analysis"
ON public.player_analysis
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_player_analysis_player_id ON public.player_analysis(player_id);
CREATE INDEX idx_player_analysis_date ON public.player_analysis(analysis_date DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_player_analysis_updated_at
BEFORE UPDATE ON public.player_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();