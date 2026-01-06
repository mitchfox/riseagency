-- Add fields for document uploads and additional info to scouting_reports
ALTER TABLE public.scouting_reports
ADD COLUMN IF NOT EXISTS rise_report_url TEXT,
ADD COLUMN IF NOT EXISTS additional_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Create scout_report_feedback table for staff feedback that shows as messages
CREATE TABLE public.scout_report_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.scouting_reports(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES public.scouts(id) ON DELETE CASCADE,
  player_feedback TEXT,
  next_steps TEXT,
  future_reference_notes TEXT,
  is_exclusive BOOLEAN DEFAULT false,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  staff_notes TEXT,
  created_by TEXT,
  read_by_scout BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scout_report_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for scout_report_feedback
-- Staff can do everything
CREATE POLICY "Staff can manage all feedback"
ON public.scout_report_feedback
FOR ALL
USING (true)
WITH CHECK (true);

-- Scouts can read feedback for their reports
CREATE POLICY "Scouts can read their feedback"
ON public.scout_report_feedback
FOR SELECT
USING (
  scout_id IN (
    SELECT id FROM public.scouts WHERE status = 'active'
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_scout_report_feedback_updated_at
BEFORE UPDATE ON public.scout_report_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();