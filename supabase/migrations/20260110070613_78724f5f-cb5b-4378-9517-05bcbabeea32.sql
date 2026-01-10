-- Create player_requests table for agent request management
CREATE TABLE public.player_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position TEXT NOT NULL,
  age_range TEXT,
  league TEXT NOT NULL,
  playstyle TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.player_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can view all player requests" 
ON public.player_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert player requests" 
ON public.player_requests 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff can update player requests" 
ON public.player_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff can delete player requests" 
ON public.player_requests 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_player_requests_updated_at
BEFORE UPDATE ON public.player_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();