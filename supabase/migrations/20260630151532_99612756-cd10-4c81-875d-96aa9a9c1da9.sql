
CREATE TABLE public.scouting_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  name text NOT NULL,
  age_group text NOT NULL,
  level text,
  season text,
  stats_url text NOT NULL,
  organiser_url text,
  source text NOT NULL DEFAULT 'fotbal.cz',
  season_active boolean NOT NULL DEFAULT true,
  last_indexed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_competitions TO authenticated;
GRANT ALL ON public.scouting_competitions TO service_role;
ALTER TABLE public.scouting_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read scouting competitions" ON public.scouting_competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write scouting competitions" ON public.scouting_competitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.scouting_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'fotbal.cz',
  source_player_id text NOT NULL,
  player_name text NOT NULL,
  player_url text,
  position text,
  date_of_birth date,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_players TO authenticated;
GRANT ALL ON public.scouting_players TO service_role;
ALTER TABLE public.scouting_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read scouting players" ON public.scouting_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write scouting players" ON public.scouting_players FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.scouting_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.scouting_players(id) ON DELETE CASCADE,
  competition_id uuid REFERENCES public.scouting_competitions(id) ON DELETE SET NULL,
  season text,
  team_name text,
  age_group text,
  appearances integer,
  minutes integer,
  goals integer,
  clean_sheets integer,
  confidence text CHECK (confidence IN ('A','B','C')),
  source_url text,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, competition_id, season)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_player_stats TO authenticated;
GRANT ALL ON public.scouting_player_stats TO service_role;
ALTER TABLE public.scouting_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read scouting player stats" ON public.scouting_player_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write scouting player stats" ON public.scouting_player_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX scouting_player_stats_player_idx ON public.scouting_player_stats(player_id);
CREATE INDEX scouting_player_stats_comp_idx ON public.scouting_player_stats(competition_id);

CREATE TRIGGER trg_scouting_competitions_updated
  BEFORE UPDATE ON public.scouting_competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scouting_players_updated
  BEFORE UPDATE ON public.scouting_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scouting_player_stats_updated
  BEFORE UPDATE ON public.scouting_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
