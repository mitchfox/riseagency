-- Update RLS policy for staff to INSERT test results
DROP POLICY IF EXISTS "Staff can manage test results" ON public.player_test_results;

-- Create separate policies for staff
CREATE POLICY "Staff can select test results"
ON public.player_test_results
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can insert test results"
ON public.player_test_results
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can update test results"
ON public.player_test_results
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can delete test results"
ON public.player_test_results
FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));