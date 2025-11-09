-- Create table for analysis point examples that AI can learn from
CREATE TABLE public.analysis_point_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('pre-match', 'post-match', 'concept', 'other')),
  title TEXT,
  paragraph_1 TEXT,
  paragraph_2 TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_point_examples ENABLE ROW LEVEL SECURITY;

-- Policies for staff to manage examples
CREATE POLICY "Admin can manage analysis examples"
ON public.analysis_point_examples
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view analysis examples"
ON public.analysis_point_examples
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_analysis_point_examples_updated_at
BEFORE UPDATE ON public.analysis_point_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();