
-- Table for messaging case studies
CREATE TABLE public.messaging_case_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  context_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for individual messages within a case study flow
CREATE TABLE public.case_study_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_study_id UUID NOT NULL REFERENCES public.messaging_case_studies(id) ON DELETE CASCADE,
  message_order INTEGER NOT NULL DEFAULT 0,
  sender_type TEXT NOT NULL DEFAULT 'us', -- 'us' or 'them'
  sender_name TEXT,
  message_text TEXT,
  image_url TEXT,
  note TEXT, -- why we said this / what we read into their response
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messaging_case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_study_messages ENABLE ROW LEVEL SECURITY;

-- Staff can manage case studies (authenticated users)
CREATE POLICY "Authenticated users can view case studies"
  ON public.messaging_case_studies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert case studies"
  ON public.messaging_case_studies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update case studies"
  ON public.messaging_case_studies FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete case studies"
  ON public.messaging_case_studies FOR DELETE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can view case study messages"
  ON public.case_study_messages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert case study messages"
  ON public.case_study_messages FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update case study messages"
  ON public.case_study_messages FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete case study messages"
  ON public.case_study_messages FOR DELETE
  TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_messaging_case_studies_updated_at
  BEFORE UPDATE ON public.messaging_case_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_study_messages_updated_at
  BEFORE UPDATE ON public.case_study_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
