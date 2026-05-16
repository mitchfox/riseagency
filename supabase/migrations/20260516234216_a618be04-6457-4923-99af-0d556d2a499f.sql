
-- Highlights Makers: lightweight portal accounts (username + password)
-- Password stored plain per explicit product requirement (low-sensitivity access).
-- Table is locked down: only service-role (via edge functions) and admins/staff (manage)
-- can access it. Anonymous and player roles cannot read passwords directly.

CREATE TABLE public.highlight_makers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX highlight_makers_username_lower_idx
  ON public.highlight_makers (lower(username));

ALTER TABLE public.highlight_makers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage highlight makers"
  ON public.highlight_makers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff manage highlight makers"
  ON public.highlight_makers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER highlight_makers_updated_at
  BEFORE UPDATE ON public.highlight_makers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assignment of players to a highlight maker
CREATE TABLE public.highlight_maker_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_maker_id UUID NOT NULL REFERENCES public.highlight_makers(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (highlight_maker_id, player_id)
);

CREATE INDEX highlight_maker_players_maker_idx ON public.highlight_maker_players (highlight_maker_id);
CREATE INDEX highlight_maker_players_player_idx ON public.highlight_maker_players (player_id);

ALTER TABLE public.highlight_maker_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage highlight maker players"
  ON public.highlight_maker_players
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff manage highlight maker players"
  ON public.highlight_maker_players
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role));
