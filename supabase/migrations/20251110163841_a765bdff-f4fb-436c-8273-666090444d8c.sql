-- Create table to map action types to R90 categories
CREATE TABLE public.action_r90_category_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL UNIQUE,
  r90_category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_r90_category_mappings ENABLE ROW LEVEL SECURITY;

-- Admin can manage mappings
CREATE POLICY "Admin can manage action category mappings"
ON public.action_r90_category_mappings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view mappings
CREATE POLICY "Staff can view action category mappings"
ON public.action_r90_category_mappings
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_action_r90_category_mappings_updated_at
BEFORE UPDATE ON public.action_r90_category_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();