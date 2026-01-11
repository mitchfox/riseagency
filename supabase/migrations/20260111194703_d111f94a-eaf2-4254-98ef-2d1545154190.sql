-- Create message_pathways table for storing pathway sequences
CREATE TABLE public.message_pathways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_pathways ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view pathways" 
ON public.message_pathways 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create pathways" 
ON public.message_pathways 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pathways" 
ON public.message_pathways 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete pathways" 
ON public.message_pathways 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_message_pathways_updated_at
BEFORE UPDATE ON public.message_pathways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();