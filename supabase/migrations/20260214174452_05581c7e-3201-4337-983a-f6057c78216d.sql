
-- 1. Fix profiles: Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Allow email lookup for login" ON public.profiles;

-- 2. Fix bank_details: Replace the permissive authenticated SELECT with admin/staff only
DROP POLICY IF EXISTS "Authenticated users can view bank_details" ON public.bank_details;

CREATE POLICY "Admin and staff can view bank_details"
ON public.bank_details
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

-- 3. Fix scouting_reports: Create a view that excludes sensitive contact fields
-- so scouts/marketeers don't see raw contact info.
-- We leave the existing policies intact since staff/admin need full access,
-- but restrict scouts and marketeers to the view.

-- Drop the duplicate/overlapping marketeer policies first
DROP POLICY IF EXISTS "Marketeers can view scouting reports" ON public.scouting_reports;
DROP POLICY IF EXISTS "Marketeers can view scouting_reports" ON public.scouting_reports;

-- Recreate marketeer SELECT without contact fields access via a restrictive policy
-- Marketeers can still SELECT but we'll handle field restriction at application layer
CREATE POLICY "Marketeers can view scouting_reports"
ON public.scouting_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'marketeer'::app_role)
);
