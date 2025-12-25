-- Create agent_training_materials table for FIFA exam resources
CREATE TABLE public.agent_training_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT,
  file_url TEXT,
  external_link TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_training_materials ENABLE ROW LEVEL SECURITY;

-- Staff can manage agent training materials
CREATE POLICY "Staff can manage agent_training_materials"
ON public.agent_training_materials
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can view agent training materials
CREATE POLICY "Staff can view agent_training_materials"
ON public.agent_training_materials
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create business_documents table for internal company docs
CREATE TABLE public.business_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT,
  file_url TEXT,
  external_link TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

-- Staff can manage business documents
CREATE POLICY "Staff can manage business_documents"
ON public.business_documents
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can view business documents
CREATE POLICY "Staff can view business_documents"
ON public.business_documents
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on agent_training_materials
CREATE TRIGGER update_agent_training_materials_updated_at
BEFORE UPDATE ON public.agent_training_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on business_documents
CREATE TRIGGER update_business_documents_updated_at
BEFORE UPDATE ON public.business_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();