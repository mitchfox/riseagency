-- Create table to link players with coaching analysis items
CREATE TABLE public.player_other_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.coaching_analysis(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, analysis_id)
);

-- Enable RLS
ALTER TABLE public.player_other_analysis ENABLE ROW LEVEL SECURITY;

-- Admin can manage all assignments
CREATE POLICY "Admin can manage player other analysis"
ON public.player_other_analysis
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view all assignments
CREATE POLICY "Staff can view player other analysis"
ON public.player_other_analysis
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Players can view their own assignments
CREATE POLICY "Players can view their own other analysis"
ON public.player_other_analysis
FOR SELECT
USING (player_id IN (
  SELECT id FROM public.players WHERE email = (auth.jwt() ->> 'email'::text)
));