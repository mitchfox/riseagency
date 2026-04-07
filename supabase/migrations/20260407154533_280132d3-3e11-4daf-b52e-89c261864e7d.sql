
-- Interaction History table
CREATE TABLE public.interaction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.club_network_contacts(id) ON DELETE CASCADE NOT NULL,
  staff_user_id UUID NOT NULL,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  interaction_type TEXT NOT NULL DEFAULT 'note',
  key_notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all interaction history"
  ON public.interaction_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interaction history"
  ON public.interaction_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interaction history"
  ON public.interaction_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interaction history"
  ON public.interaction_history FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_interaction_history_updated_at
  BEFORE UPDATE ON public.interaction_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prospect Board enhancements
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS probability_weight INTEGER DEFAULT 0;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS projected_revenue NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS revenue_currency TEXT DEFAULT 'GBP';

-- Transfer Report enhancements
ALTER TABLE public.transfer_reports ADD COLUMN IF NOT EXISTS section_order TEXT[] DEFAULT ARRAY['stats', 'highlights', 'biography', 'form_chart', 'graphics', 'clips', 'comparison', 'scouting_notes'];
