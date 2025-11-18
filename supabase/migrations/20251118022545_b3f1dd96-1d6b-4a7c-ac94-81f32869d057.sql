-- Add RLS policy for players to view their own marketing gallery images
CREATE POLICY "Players can view their own marketing gallery"
ON public.marketing_gallery
FOR SELECT
TO authenticated
USING (
  player_id IN (
    SELECT id FROM players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);