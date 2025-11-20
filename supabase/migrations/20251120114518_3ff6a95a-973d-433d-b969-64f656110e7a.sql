-- Allow staff users to update player records from the Player Management screen
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can update players" 
ON public.players
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));