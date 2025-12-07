-- Enable RLS on player_club_submissions
ALTER TABLE public.player_club_submissions ENABLE ROW LEVEL SECURITY;

-- Players can view their own submissions
CREATE POLICY "Players can view their own submissions"
ON public.player_club_submissions
FOR SELECT
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Players can insert their own submissions
CREATE POLICY "Players can insert their own submissions"
ON public.player_club_submissions
FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Players can update their own submissions
CREATE POLICY "Players can update their own submissions"
ON public.player_club_submissions
FOR UPDATE
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Players can delete their own submissions
CREATE POLICY "Players can delete their own submissions"
ON public.player_club_submissions
FOR DELETE
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Staff can manage all submissions
CREATE POLICY "Staff can manage player_club_submissions"
ON public.player_club_submissions
FOR ALL
USING (
  has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);