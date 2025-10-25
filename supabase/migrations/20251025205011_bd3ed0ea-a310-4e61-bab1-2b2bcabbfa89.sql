-- Create table for form submissions
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Staff can view all form submissions
CREATE POLICY "Staff can view all form submissions"
ON public.form_submissions
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow anonymous inserts (for public forms)
CREATE POLICY "Anyone can submit forms"
ON public.form_submissions
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_form_submissions_created_at ON public.form_submissions(created_at DESC);
CREATE INDEX idx_form_submissions_form_type ON public.form_submissions(form_type);