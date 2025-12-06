-- Add policy allowing staff to manage all player_club_submissions
CREATE POLICY "Staff can manage all player_club_submissions" 
ON public.player_club_submissions 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));