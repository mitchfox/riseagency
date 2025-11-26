-- Create scout messages table for bulletin board
CREATE TABLE public.scout_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  priority TEXT NOT NULL DEFAULT 'normal',
  visible_to_scouts BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.scout_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scout messages
CREATE POLICY "Scouts can view messages"
ON public.scout_messages
FOR SELECT
USING (visible_to_scouts = true);

CREATE POLICY "Staff can manage scout messages"
ON public.scout_messages
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_scout_messages_updated_at
BEFORE UPDATE ON public.scout_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();