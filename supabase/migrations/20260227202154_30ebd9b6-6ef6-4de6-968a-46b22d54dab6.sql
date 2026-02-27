-- Allow inserts into staff_notification_events from any context
-- This is safe because SELECT is restricted to staff only, and this table is for internal logging
CREATE POLICY "Allow notification inserts" 
ON public.staff_notification_events 
FOR INSERT 
WITH CHECK (true);