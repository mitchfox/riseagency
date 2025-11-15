-- Drop the old player invoice policy that requires auth
DROP POLICY IF EXISTS "Players can view their own invoices" ON invoices;

-- Create new policy allowing anyone to view invoices
CREATE POLICY "Anyone can view invoices"
ON invoices
FOR SELECT
USING (true);