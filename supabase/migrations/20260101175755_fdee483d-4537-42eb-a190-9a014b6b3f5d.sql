-- Create table for saved signatures
CREATE TABLE public.saved_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Signature',
  signature_data TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_signatures ENABLE ROW LEVEL SECURITY;

-- Users can only see their own signatures
CREATE POLICY "Users can view their own signatures" 
ON public.saved_signatures 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own signatures" 
ON public.saved_signatures 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures" 
ON public.saved_signatures 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures" 
ON public.saved_signatures 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_signatures_updated_at
BEFORE UPDATE ON public.saved_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();