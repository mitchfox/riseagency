
-- Create marketing_ideas table
CREATE TABLE public.marketing_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  canva_link TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_ideas ENABLE ROW LEVEL SECURITY;

-- Staff can manage marketing ideas
CREATE POLICY "Staff can manage marketing_ideas"
ON public.marketing_ideas
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Marketeers can manage marketing ideas
CREATE POLICY "Marketeers can manage marketing_ideas"
ON public.marketing_ideas
FOR ALL
USING (has_role(auth.uid(), 'marketeer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_ideas_updated_at
BEFORE UPDATE ON public.marketing_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
