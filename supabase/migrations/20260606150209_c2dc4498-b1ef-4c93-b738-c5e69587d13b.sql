
-- Club outreach: multi-player + contact + communications

-- 1. Extend club_outreach_links with club contact + nullable player_id
ALTER TABLE public.club_outreach_links
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE public.club_outreach_links
  ADD COLUMN IF NOT EXISTS club_contact_name text,
  ADD COLUMN IF NOT EXISTS club_contact_role text,
  ADD COLUMN IF NOT EXISTS club_contact_phone text;

-- 2. New table: club_outreach_link_players (multi-player support)
CREATE TABLE IF NOT EXISTS public.club_outreach_link_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.club_outreach_links(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  position_slot text,
  fit_recommendation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (link_id, player_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_link_players TO authenticated;
GRANT ALL ON public.club_outreach_link_players TO service_role;

ALTER TABLE public.club_outreach_link_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage link players"
  ON public.club_outreach_link_players
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_club_outreach_link_players_updated_at
  BEFORE UPDATE ON public.club_outreach_link_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. New table: club_outreach_communications (log of who was contacted etc.)
CREATE TABLE IF NOT EXISTS public.club_outreach_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id uuid NOT NULL REFERENCES public.club_outreach_links(id) ON DELETE CASCADE,
  player_id uuid,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  contact_name text,
  contact_role text,
  channel text,
  summary text,
  next_step text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_communications TO authenticated;
GRANT ALL ON public.club_outreach_communications TO service_role;

ALTER TABLE public.club_outreach_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage outreach communications"
  ON public.club_outreach_communications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- Players can view their own communications via their player record's email matching auth user email
CREATE POLICY "Players can view their outreach communications"
  ON public.club_outreach_communications
  FOR SELECT
  TO authenticated
  USING (
    player_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = club_outreach_communications.player_id
        AND lower(p.email) = lower((auth.jwt() ->> 'email'))
    )
  );

CREATE TRIGGER update_club_outreach_communications_updated_at
  BEFORE UPDATE ON public.club_outreach_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_club_outreach_comms_player ON public.club_outreach_communications(player_id);
CREATE INDEX IF NOT EXISTS idx_club_outreach_comms_outreach ON public.club_outreach_communications(outreach_id);
CREATE INDEX IF NOT EXISTS idx_club_outreach_link_players_link ON public.club_outreach_link_players(link_id);

-- 4. Backfill existing single-player links into link_players
INSERT INTO public.club_outreach_link_players (link_id, player_id, fit_recommendation, sort_order)
SELECT l.id, l.player_id, l.fit_recommendation, 0
FROM public.club_outreach_links l
WHERE l.player_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.club_outreach_link_players lp WHERE lp.link_id = l.id
  );
