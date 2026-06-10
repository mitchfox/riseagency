CREATE POLICY "Players can view their own outreach link rows"
ON public.club_outreach_link_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = club_outreach_link_players.player_id
      AND lower(p.email) = lower((auth.jwt() ->> 'email'::text))
  )
);