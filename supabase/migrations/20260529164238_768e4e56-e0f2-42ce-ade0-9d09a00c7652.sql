CREATE TABLE public.player_seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL,
  name text NOT NULL,
  start_analysis_id uuid REFERENCES public.player_analysis(id) ON DELETE SET NULL,
  end_analysis_id uuid REFERENCES public.player_analysis(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_seasons_player ON public.player_seasons(player_id);

GRANT SELECT ON public.player_seasons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_seasons TO authenticated;
GRANT ALL ON public.player_seasons TO service_role;

ALTER TABLE public.player_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to player_seasons" ON public.player_seasons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open select for authenticated player_seasons" ON public.player_seasons FOR SELECT USING (true);

CREATE TRIGGER update_player_seasons_updated_at BEFORE UPDATE ON public.player_seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();