
-- Club Outreach links
CREATE TABLE public.club_outreach_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text NOT NULL UNIQUE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.club_map_positions(id) ON DELETE RESTRICT,
  fit_recommendation text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
GRANT SELECT ON public.club_outreach_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_links TO authenticated;
GRANT ALL ON public.club_outreach_links TO service_role;
ALTER TABLE public.club_outreach_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can read non-archived club outreach links" ON public.club_outreach_links FOR SELECT TO anon USING (archived_at IS NULL);
CREATE POLICY "Authenticated can read all club outreach links" ON public.club_outreach_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff/admin can manage club outreach links" ON public.club_outreach_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role));
CREATE TRIGGER trg_club_outreach_links_updated BEFORE UPDATE ON public.club_outreach_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-player defaults
CREATE TABLE public.club_outreach_player_defaults (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  stars_url_override text,
  highlights_url text,
  proof_of_representation_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_outreach_player_defaults TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_player_defaults TO authenticated;
GRANT ALL ON public.club_outreach_player_defaults TO service_role;
ALTER TABLE public.club_outreach_player_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read club outreach player defaults" ON public.club_outreach_player_defaults FOR SELECT USING (true);
CREATE POLICY "Staff/admin manage club outreach player defaults" ON public.club_outreach_player_defaults FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role));
CREATE TRIGGER trg_club_outreach_player_defaults_updated BEFORE UPDATE ON public.club_outreach_player_defaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Singleton settings
CREATE TABLE public.club_outreach_settings (
  id int PRIMARY KEY DEFAULT 1,
  whatsapp_number text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_outreach_settings_singleton CHECK (id = 1)
);
INSERT INTO public.club_outreach_settings (id, whatsapp_number) VALUES (1, '') ON CONFLICT DO NOTHING;
GRANT SELECT ON public.club_outreach_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_outreach_settings TO authenticated;
GRANT ALL ON public.club_outreach_settings TO service_role;
ALTER TABLE public.club_outreach_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read club outreach settings" ON public.club_outreach_settings FOR SELECT USING (true);
CREATE POLICY "Staff/admin manage club outreach settings" ON public.club_outreach_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role));

-- Visit analytics
CREATE TABLE public.club_outreach_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id uuid NOT NULL REFERENCES public.club_outreach_links(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);
GRANT INSERT ON public.club_outreach_visits TO anon;
GRANT SELECT, INSERT ON public.club_outreach_visits TO authenticated;
GRANT ALL ON public.club_outreach_visits TO service_role;
ALTER TABLE public.club_outreach_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a club outreach visit" ON public.club_outreach_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read club outreach visits" ON public.club_outreach_visits FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_club_outreach_links_short_id ON public.club_outreach_links(short_id);
CREATE INDEX idx_club_outreach_links_player ON public.club_outreach_links(player_id);
CREATE INDEX idx_club_outreach_links_club ON public.club_outreach_links(club_id);
CREATE INDEX idx_club_outreach_visits_outreach ON public.club_outreach_visits(outreach_id);
