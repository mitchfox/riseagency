-- Add category column to staff_goals for Vision Board organization
ALTER TABLE public.staff_goals 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Add category column to staff_tasks for Vision Board organization
ALTER TABLE public.staff_tasks 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Create vision_board table for vision statements and actionable plans
CREATE TABLE public.vision_board (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  vision_statement text,
  actionable_plans text[] DEFAULT '{}',
  display_order integer DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_board ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (staff access)
CREATE POLICY "Staff can view vision board" 
ON public.vision_board 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff can manage vision board" 
ON public.vision_board 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default vision board data based on the image
INSERT INTO public.vision_board (category, vision_statement, actionable_plans, display_order)
VALUES 
  ('Scouting', 'Fully active scouting network via portal', ARRAY['LinkedIn Ads', 'Social Media Reach Out'], 1),
  ('Recruitment', 'Constant flow of R-Level players', ARRAY['Team contact strategy', 'Recruitment funnels', 'Prospect board logging'], 2),
  ('Networking', 'Ever-expanding contact list & relation building', ARRAY['Automated reminders', 'Team contact strategy', 'LinkedIn post strategy', 'Cold outreach strategies'], 3),
  ('Marketing', 'Clear brand, innovative, performance-centered', ARRAY['Bi-weekly meetings', 'Social strategy', 'Feedback strategy'], 4),
  ('Performance', 'Top level, structured, clear', ARRAY['Finalised portal', 'Pipeline meeting'], 5);

-- Create trigger for updated_at
CREATE TRIGGER update_vision_board_updated_at
BEFORE UPDATE ON public.vision_board
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();