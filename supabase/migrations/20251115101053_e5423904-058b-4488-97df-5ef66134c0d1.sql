-- Allow staff to manage player_analysis records
CREATE POLICY "Staff can manage player analysis"
ON public.player_analysis
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Allow staff to manage performance_report_actions
CREATE POLICY "Staff can manage performance report actions"
ON public.performance_report_actions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));