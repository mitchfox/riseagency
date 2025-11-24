-- Create marketing_campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  platform TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  target_audience TEXT,
  goals TEXT,
  budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for staff/admin access
CREATE POLICY "Staff can view campaigns"
ON public.marketing_campaigns
FOR SELECT
USING (true);

CREATE POLICY "Staff can create campaigns"
ON public.marketing_campaigns
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can update campaigns"
ON public.marketing_campaigns
FOR UPDATE
USING (true);

CREATE POLICY "Staff can delete campaigns"
ON public.marketing_campaigns
FOR DELETE
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();