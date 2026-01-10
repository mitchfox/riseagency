-- Add RLS policies for jobs table to allow staff to manage jobs
-- First check if policies exist and drop them if they do
DROP POLICY IF EXISTS "Staff can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff can delete jobs" ON public.jobs;

-- Create comprehensive policies for staff to manage jobs
CREATE POLICY "Staff can insert jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update jobs" 
ON public.jobs 
FOR UPDATE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can delete jobs" 
ON public.jobs 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Ensure profiles table has proper update policy for phone_number
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;

CREATE POLICY "Admin can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));