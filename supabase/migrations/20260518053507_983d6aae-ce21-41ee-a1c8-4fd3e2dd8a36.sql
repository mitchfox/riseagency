
CREATE TABLE IF NOT EXISTS public.investor_overview_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investor_overview_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.investor_overview_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  content text,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_overview_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_overview_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage investor overview sections"
  ON public.investor_overview_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can manage investor overview cards"
  ON public.investor_overview_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER trg_investor_overview_sections_updated
  BEFORE UPDATE ON public.investor_overview_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_investor_overview_cards_updated
  BEFORE UPDATE ON public.investor_overview_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.investor_users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
