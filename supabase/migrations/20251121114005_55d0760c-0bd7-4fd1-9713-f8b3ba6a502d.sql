-- Create player_outreach_youth table
CREATE TABLE IF NOT EXISTS public.player_outreach_youth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  ig_handle TEXT,
  messaged BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  parents_name TEXT,
  parent_contact TEXT,
  parent_approval BOOLEAN DEFAULT false,
  initial_message TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player_outreach_pro table
CREATE TABLE IF NOT EXISTS public.player_outreach_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  ig_handle TEXT,
  messaged BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  initial_message TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_outreach_youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_outreach_pro ENABLE ROW LEVEL SECURITY;

-- Create policies for youth table
CREATE POLICY "Staff can view youth outreach"
  ON public.player_outreach_youth
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage youth outreach"
  ON public.player_outreach_youth
  FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create policies for pro table
CREATE POLICY "Staff can view pro outreach"
  ON public.player_outreach_pro
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage pro outreach"
  ON public.player_outreach_pro
  FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on youth table
CREATE TRIGGER update_player_outreach_youth_updated_at
  BEFORE UPDATE ON public.player_outreach_youth
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on pro table
CREATE TRIGGER update_player_outreach_pro_updated_at
  BEFORE UPDATE ON public.player_outreach_pro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();