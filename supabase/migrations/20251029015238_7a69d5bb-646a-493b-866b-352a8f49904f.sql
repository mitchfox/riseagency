-- Create coaching_aphorisms table
CREATE TABLE public.coaching_aphorisms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.coaching_aphorisms ENABLE ROW LEVEL SECURITY;

-- Create policy for players to view aphorisms
CREATE POLICY "Players can view aphorisms"
ON public.coaching_aphorisms
FOR SELECT
USING (true);

-- Create policy for staff to manage aphorisms
CREATE POLICY "Staff can manage aphorisms"
ON public.coaching_aphorisms
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_coaching_aphorisms_updated_at
BEFORE UPDATE ON public.coaching_aphorisms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();