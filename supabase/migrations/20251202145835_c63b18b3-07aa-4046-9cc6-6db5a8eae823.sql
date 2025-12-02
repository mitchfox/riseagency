-- Create table for storing player testing scores
CREATE TABLE public.player_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL,
  score TEXT NOT NULL,
  notes TEXT,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_test_results ENABLE ROW LEVEL SECURITY;

-- Players can view their own test results
CREATE POLICY "Players can view their own test results"
ON public.player_test_results
FOR SELECT
USING (player_id IN (
  SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
));

-- Players can insert their own test results
CREATE POLICY "Players can insert their own test results"
ON public.player_test_results
FOR INSERT
WITH CHECK (player_id IN (
  SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
));

-- Players can update their own test results
CREATE POLICY "Players can update their own test results"
ON public.player_test_results
FOR UPDATE
USING (player_id IN (
  SELECT id FROM players WHERE email = (auth.jwt() ->> 'email')
));

-- Staff can manage all test results
CREATE POLICY "Staff can manage test results"
ON public.player_test_results
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_player_test_results_player_date ON public.player_test_results(player_id, test_date);

-- Create trigger for updated_at
CREATE TRIGGER update_player_test_results_updated_at
BEFORE UPDATE ON public.player_test_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();