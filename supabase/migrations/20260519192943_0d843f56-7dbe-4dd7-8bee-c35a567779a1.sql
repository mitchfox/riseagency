
CREATE TABLE public.investor_time_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investor_time_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.investor_time_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  rough_time text,
  highlights text[] NOT NULL DEFAULT '{}',
  staff_task_id uuid,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investor_priority_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investor_priority_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.investor_priority_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  rough_time text,
  highlights text[] NOT NULL DEFAULT '{}',
  staff_task_id uuid,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_time_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_time_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_priority_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_priority_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage investor time categories"
  ON public.investor_time_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff manage investor time items"
  ON public.investor_time_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff manage investor priority categories"
  ON public.investor_priority_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff manage investor priority items"
  ON public.investor_priority_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER trg_investor_time_categories_updated
  BEFORE UPDATE ON public.investor_time_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_investor_time_items_updated
  BEFORE UPDATE ON public.investor_time_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_investor_priority_categories_updated
  BEFORE UPDATE ON public.investor_priority_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_investor_priority_items_updated
  BEFORE UPDATE ON public.investor_priority_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
