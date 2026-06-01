
-- Marketing strategy: persistent platforms (tabs) and sections per platform
CREATE TABLE public.marketing_strategy_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategy_platforms TO authenticated;
GRANT ALL ON public.marketing_strategy_platforms TO service_role;

ALTER TABLE public.marketing_strategy_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view strategy platforms"
  ON public.marketing_strategy_platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage strategy platforms"
  ON public.marketing_strategy_platforms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_marketing_strategy_platforms_updated_at
  BEFORE UPDATE ON public.marketing_strategy_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.marketing_strategy_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_id UUID NOT NULL REFERENCES public.marketing_strategy_platforms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_strategy_sections_platform ON public.marketing_strategy_sections(platform_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategy_sections TO authenticated;
GRANT ALL ON public.marketing_strategy_sections TO service_role;

ALTER TABLE public.marketing_strategy_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view strategy sections"
  ON public.marketing_strategy_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage strategy sections"
  ON public.marketing_strategy_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_marketing_strategy_sections_updated_at
  BEFORE UPDATE ON public.marketing_strategy_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default platforms
INSERT INTO public.marketing_strategy_platforms (name, slug, icon, sort_order) VALUES
  ('YouTube', 'youtube', 'Youtube', 0),
  ('Instagram', 'instagram', 'Instagram', 1),
  ('TikTok', 'tiktok', 'Music2', 2),
  ('LinkedIn', 'linkedin', 'Linkedin', 3),
  ('X', 'x', 'Twitter', 4);
