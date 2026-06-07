GRANT SELECT ON public.player_offer_settings TO anon;
GRANT SELECT ON public.player_offer_settings TO authenticated;
GRANT ALL ON public.player_offer_settings TO service_role;

DROP POLICY IF EXISTS "Public can read live offer settings" ON public.player_offer_settings;

CREATE POLICY "Public can read live offer settings"
  ON public.player_offer_settings
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.players p
      WHERE p.id = player_offer_settings.player_id
        AND (
          p.has_representation_offer = true
          OR lower(coalesce(p.representation_status, '')) = 'prospect'
        )
    )
  );