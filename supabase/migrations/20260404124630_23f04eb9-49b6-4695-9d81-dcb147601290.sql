
-- Country profiles for the network
CREATE TABLE public.network_country_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_name TEXT NOT NULL UNIQUE,
  playing_style TEXT,
  common_formations TEXT,
  key_characteristics TEXT,
  league_structure TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_country_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view country profiles" ON public.network_country_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage country profiles" ON public.network_country_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Club profiles for the network
CREATE TABLE public.network_club_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL UNIQUE,
  country TEXT,
  description TEXT,
  playing_style TEXT,
  league TEXT,
  tier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_club_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view club profiles" ON public.network_club_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage club profiles" ON public.network_club_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Role profiles for the network
CREATE TABLE public.network_role_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  typical_responsibilities TEXT,
  seniority_level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_role_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view role profiles" ON public.network_role_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage role profiles" ON public.network_role_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_network_country_profiles_updated_at BEFORE UPDATE ON public.network_country_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_network_club_profiles_updated_at BEFORE UPDATE ON public.network_club_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_network_role_profiles_updated_at BEFORE UPDATE ON public.network_role_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
