-- Add hidden column to site_visits table
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;

-- Create index for better performance when filtering hidden visitors
CREATE INDEX IF NOT EXISTS idx_site_visits_hidden ON site_visits(hidden);

-- Update RLS policy to allow staff to update the hidden field
DROP POLICY IF EXISTS "Staff can update site visits" ON site_visits;
CREATE POLICY "Staff can update site visits"
ON site_visits
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
