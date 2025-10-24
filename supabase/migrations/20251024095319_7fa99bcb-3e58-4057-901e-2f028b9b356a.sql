-- Create performance report actions table
CREATE TABLE public.performance_report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.player_analysis(id) ON DELETE CASCADE,
  action_number integer NOT NULL,
  minute numeric NOT NULL,
  action_score numeric NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_report_actions ENABLE ROW LEVEL SECURITY;

-- Players can view their own performance report actions
CREATE POLICY "Players can view their own performance report actions"
ON public.performance_report_actions
FOR SELECT
USING (
  analysis_id IN (
    SELECT pa.id 
    FROM player_analysis pa
    JOIN players p ON pa.player_id = p.id
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);

-- Staff can manage all performance report actions
CREATE POLICY "Staff can manage all performance report actions"
ON public.performance_report_actions
FOR ALL
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_performance_report_actions_updated_at
BEFORE UPDATE ON public.performance_report_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();