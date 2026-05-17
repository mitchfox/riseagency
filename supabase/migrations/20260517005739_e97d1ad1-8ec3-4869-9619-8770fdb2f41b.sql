ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Authenticated can update playlist favourite" ON public.playlists;
CREATE POLICY "Authenticated can update playlist favourite"
  ON public.playlists FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);