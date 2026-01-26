-- Add public read access for active jobs
CREATE POLICY "Anyone can view active jobs" 
ON public.jobs 
FOR SELECT 
USING (is_active = true);

-- Add staff-only policy for managing jobs
CREATE POLICY "Staff can manage all jobs" 
ON public.jobs 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
) 
WITH CHECK (
  has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);