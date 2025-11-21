-- Create component_locks table for site management
CREATE TABLE public.component_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name TEXT NOT NULL UNIQUE,
  component_path TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.component_locks ENABLE ROW LEVEL SECURITY;

-- Admin can manage all component locks
CREATE POLICY "Admin can manage component locks"
ON public.component_locks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view component locks
CREATE POLICY "Staff can view component locks"
ON public.component_locks
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_component_locks_updated_at
  BEFORE UPDATE ON public.component_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default complex components
INSERT INTO public.component_locks (component_name, component_path, description) VALUES
  ('Player Management', '/staff/players', 'Manage player accounts, highlights, and profiles'),
  ('Recruitment Management', '/staff/recruitment', 'Manage prospects, templates, and player outreach'),
  ('Analysis Management', '/staff/analysis', 'Create and manage player analysis and reports'),
  ('Programming Management', '/staff/programming', 'Manage training programs and exercises'),
  ('Scouting Centre', '/staff/scouting', 'Scouting reports and evaluations'),
  ('Marketing Management', '/staff/marketing', 'Marketing gallery and campaigns'),
  ('Legal Management', '/staff/legal', 'Legal documents and contracts'),
  ('Invoice Management', '/staff/invoices', 'Manage invoices and billing'),
  ('Club Network', '/staff/clubs', 'Club and contact management'),
  ('Staff Accounts', '/staff/accounts', 'Staff user account management'),
  ('R90 Ratings', '/staff/r90', 'R90 rating system configuration'),
  ('Tactical Schemes', '/staff/tactical', 'Tactical scheme templates'),
  ('Between The Lines', '/staff/btl', 'Between The Lines content management'),
  ('Updates Management', '/staff/updates', 'Platform updates and announcements'),
  ('Blog Management', '/staff/blog', 'Blog posts and content'),
  ('Site Visitors', '/staff/visitors', 'Site analytics and visitor tracking'),
  ('Coaching Database', '/staff/coaching', 'Coaching exercises, sessions, and analysis'),
  ('Form Submissions', '/staff/forms', 'Contact form and submission management')
ON CONFLICT (component_name) DO NOTHING;