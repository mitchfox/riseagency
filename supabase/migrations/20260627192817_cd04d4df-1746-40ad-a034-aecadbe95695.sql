CREATE POLICY "Players read own programming weeks"
ON public.programming_weeks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = programming_weeks.player_id
      AND lower(p.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);