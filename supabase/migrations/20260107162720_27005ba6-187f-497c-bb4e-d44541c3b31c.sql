-- Create table to store role permissions for staff portal features
CREATE TABLE public.role_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'marketeer')),
    section_id TEXT NOT NULL,
    section_title TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_title TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(role, section_id)
);

-- Enable Row Level Security
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view permissions
CREATE POLICY "Admins can view role permissions" 
ON public.role_permissions 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Only admins can insert permissions
CREATE POLICY "Admins can insert role permissions" 
ON public.role_permissions 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Only admins can update permissions
CREATE POLICY "Admins can update role permissions" 
ON public.role_permissions 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Only admins can delete permissions
CREATE POLICY "Admins can delete role permissions" 
ON public.role_permissions 
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for all roles and sections
-- Admin role - full access
INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit) VALUES
-- Overview
('admin', 'overview', 'Overview', 'overview', 'Overview', true, true),
('admin', 'focusedtasks', 'Focused Tasks', 'overview', 'Overview', true, true),
('admin', 'goalstasks', 'Goals & Tasks', 'overview', 'Overview', true, true),
('admin', 'staffschedules', 'Staff Schedules', 'overview', 'Overview', true, true),
('admin', 'notifications', 'Notifications', 'overview', 'Overview', true, true),
-- Coaching
('admin', 'schedule', 'Schedule', 'coaching', 'Coaching', true, true),
('admin', 'coaching', 'Coaching Database', 'coaching', 'Coaching', true, true),
('admin', 'tacticsboard', 'Tactics Board', 'coaching', 'Coaching', true, true),
('admin', 'meetings', 'Meetings', 'coaching', 'Coaching', true, true),
('admin', 'analysis', 'Analysis Writer', 'coaching', 'Coaching', true, true),
('admin', 'athletecentre', 'Athlete Centre', 'coaching', 'Coaching', true, true),
-- Management
('admin', 'players', 'Player Management', 'management', 'Management', true, true),
('admin', 'transferhub', 'Transfer Hub', 'management', 'Management', true, true),
('admin', 'updates', 'Player Updates', 'management', 'Management', true, true),
-- Network & Recruitment
('admin', 'clubnetwork', 'Club Network', 'network', 'Network & Recruitment', true, true),
('admin', 'playerlist', 'Player List', 'network', 'Network & Recruitment', true, true),
('admin', 'recruitment', 'Recruitment', 'network', 'Network & Recruitment', true, true),
('admin', 'playerdatabase', 'Player Database', 'network', 'Network & Recruitment', true, true),
('admin', 'scoutingcentre', 'Scouting Centre', 'network', 'Network & Recruitment', true, true),
('admin', 'submissions', 'Form Submissions', 'network', 'Network & Recruitment', true, true),
-- Marketing & Brand
('admin', 'marketing', 'Marketing', 'marketing', 'Marketing & Brand', true, true),
('admin', 'marketingideas', 'Ideas', 'marketing', 'Marketing & Brand', true, true),
('admin', 'contentcreator', 'Content Creator', 'marketing', 'Marketing & Brand', true, true),
('admin', 'blog', 'News Articles', 'marketing', 'Marketing & Brand', true, true),
('admin', 'betweenthelines', 'Between The Lines', 'marketing', 'Marketing & Brand', true, true),
('admin', 'openaccess', 'Open Access', 'marketing', 'Marketing & Brand', true, true),
('admin', 'visitors', 'Site Visitors', 'marketing', 'Marketing & Brand', true, true),
-- Financial
('admin', 'invoices', 'Invoices', 'financial', 'Financial', true, true),
('admin', 'payments', 'Payments In/Out', 'financial', 'Financial', true, true),
('admin', 'expenses', 'Expenses', 'financial', 'Financial', true, true),
('admin', 'taxrecords', 'Tax Records', 'financial', 'Financial', true, true),
('admin', 'budgets', 'Budgets', 'financial', 'Financial', true, true),
('admin', 'financialreports', 'Reports', 'financial', 'Financial', true, true),
-- Admin & Legal
('admin', 'legal', 'Legal', 'admin', 'Admin & Legal', true, true),
('admin', 'sitetext', 'Site Text', 'admin', 'Admin & Legal', true, true),
('admin', 'languages', 'Languages', 'admin', 'Admin & Legal', true, true),
('admin', 'passwords', 'Player Passwords', 'admin', 'Admin & Legal', true, true),
('admin', 'staffaccounts', 'Staff Accounts', 'admin', 'Admin & Legal', true, true),
('admin', 'pwainstall', 'PWA Install', 'admin', 'Admin & Legal', true, true),
('admin', 'offlinemanager', 'Offline Content', 'admin', 'Admin & Legal', true, true),
('admin', 'pushnotifications', 'Push Notifications', 'admin', 'Admin & Legal', true, true);

-- Staff role - view only most features
INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit) VALUES
-- Overview
('staff', 'overview', 'Overview', 'overview', 'Overview', true, false),
('staff', 'focusedtasks', 'Focused Tasks', 'overview', 'Overview', true, false),
('staff', 'goalstasks', 'Goals & Tasks', 'overview', 'Overview', true, false),
('staff', 'staffschedules', 'Staff Schedules', 'overview', 'Overview', true, false),
('staff', 'notifications', 'Notifications', 'overview', 'Overview', false, false),
-- Coaching
('staff', 'schedule', 'Schedule', 'coaching', 'Coaching', true, false),
('staff', 'coaching', 'Coaching Database', 'coaching', 'Coaching', true, false),
('staff', 'tacticsboard', 'Tactics Board', 'coaching', 'Coaching', true, false),
('staff', 'meetings', 'Meetings', 'coaching', 'Coaching', true, false),
('staff', 'analysis', 'Analysis Writer', 'coaching', 'Coaching', true, false),
('staff', 'athletecentre', 'Athlete Centre', 'coaching', 'Coaching', true, false),
-- Management
('staff', 'players', 'Player Management', 'management', 'Management', true, false),
('staff', 'transferhub', 'Transfer Hub', 'management', 'Management', true, false),
('staff', 'updates', 'Player Updates', 'management', 'Management', true, false),
-- Network & Recruitment
('staff', 'clubnetwork', 'Club Network', 'network', 'Network & Recruitment', true, false),
('staff', 'playerlist', 'Player List', 'network', 'Network & Recruitment', true, false),
('staff', 'recruitment', 'Recruitment', 'network', 'Network & Recruitment', true, false),
('staff', 'playerdatabase', 'Player Database', 'network', 'Network & Recruitment', true, false),
('staff', 'scoutingcentre', 'Scouting Centre', 'network', 'Network & Recruitment', true, false),
('staff', 'submissions', 'Form Submissions', 'network', 'Network & Recruitment', true, false),
-- Marketing & Brand
('staff', 'marketing', 'Marketing', 'marketing', 'Marketing & Brand', true, false),
('staff', 'marketingideas', 'Ideas', 'marketing', 'Marketing & Brand', true, false),
('staff', 'contentcreator', 'Content Creator', 'marketing', 'Marketing & Brand', true, false),
('staff', 'blog', 'News Articles', 'marketing', 'Marketing & Brand', true, false),
('staff', 'betweenthelines', 'Between The Lines', 'marketing', 'Marketing & Brand', true, false),
('staff', 'openaccess', 'Open Access', 'marketing', 'Marketing & Brand', true, false),
('staff', 'visitors', 'Site Visitors', 'marketing', 'Marketing & Brand', true, false),
-- Financial
('staff', 'invoices', 'Invoices', 'financial', 'Financial', true, false),
('staff', 'payments', 'Payments In/Out', 'financial', 'Financial', true, false),
('staff', 'expenses', 'Expenses', 'financial', 'Financial', true, false),
('staff', 'taxrecords', 'Tax Records', 'financial', 'Financial', true, false),
('staff', 'budgets', 'Budgets', 'financial', 'Financial', true, false),
('staff', 'financialreports', 'Reports', 'financial', 'Financial', true, false),
-- Admin & Legal
('staff', 'legal', 'Legal', 'admin', 'Admin & Legal', true, false),
('staff', 'sitetext', 'Site Text', 'admin', 'Admin & Legal', true, false),
('staff', 'languages', 'Languages', 'admin', 'Admin & Legal', true, false),
('staff', 'passwords', 'Player Passwords', 'admin', 'Admin & Legal', false, false),
('staff', 'staffaccounts', 'Staff Accounts', 'admin', 'Admin & Legal', false, false),
('staff', 'pwainstall', 'PWA Install', 'admin', 'Admin & Legal', true, false),
('staff', 'offlinemanager', 'Offline Content', 'admin', 'Admin & Legal', true, false),
('staff', 'pushnotifications', 'Push Notifications', 'admin', 'Admin & Legal', true, false);

-- Marketeer role - limited access
INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit) VALUES
-- Overview
('marketeer', 'overview', 'Overview', 'overview', 'Overview', true, false),
('marketeer', 'focusedtasks', 'Focused Tasks', 'overview', 'Overview', true, true),
('marketeer', 'goalstasks', 'Goals & Tasks', 'overview', 'Overview', true, false),
('marketeer', 'staffschedules', 'Staff Schedules', 'overview', 'Overview', false, false),
('marketeer', 'notifications', 'Notifications', 'overview', 'Overview', false, false),
-- Coaching
('marketeer', 'schedule', 'Schedule', 'coaching', 'Coaching', false, false),
('marketeer', 'coaching', 'Coaching Database', 'coaching', 'Coaching', false, false),
('marketeer', 'tacticsboard', 'Tactics Board', 'coaching', 'Coaching', false, false),
('marketeer', 'meetings', 'Meetings', 'coaching', 'Coaching', false, false),
('marketeer', 'analysis', 'Analysis Writer', 'coaching', 'Coaching', false, false),
('marketeer', 'athletecentre', 'Athlete Centre', 'coaching', 'Coaching', false, false),
-- Management
('marketeer', 'players', 'Player Management', 'management', 'Management', true, false),
('marketeer', 'transferhub', 'Transfer Hub', 'management', 'Management', false, false),
('marketeer', 'updates', 'Player Updates', 'management', 'Management', false, false),
-- Network & Recruitment
('marketeer', 'clubnetwork', 'Club Network', 'network', 'Network & Recruitment', true, true),
('marketeer', 'playerlist', 'Player List', 'network', 'Network & Recruitment', true, true),
('marketeer', 'recruitment', 'Recruitment', 'network', 'Network & Recruitment', true, true),
('marketeer', 'playerdatabase', 'Player Database', 'network', 'Network & Recruitment', true, true),
('marketeer', 'scoutingcentre', 'Scouting Centre', 'network', 'Network & Recruitment', true, true),
('marketeer', 'submissions', 'Form Submissions', 'network', 'Network & Recruitment', true, true),
-- Marketing & Brand
('marketeer', 'marketing', 'Marketing', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'marketingideas', 'Ideas', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'contentcreator', 'Content Creator', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'blog', 'News Articles', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'betweenthelines', 'Between The Lines', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'openaccess', 'Open Access', 'marketing', 'Marketing & Brand', true, true),
('marketeer', 'visitors', 'Site Visitors', 'marketing', 'Marketing & Brand', true, true),
-- Financial
('marketeer', 'invoices', 'Invoices', 'financial', 'Financial', false, false),
('marketeer', 'payments', 'Payments In/Out', 'financial', 'Financial', false, false),
('marketeer', 'expenses', 'Expenses', 'financial', 'Financial', false, false),
('marketeer', 'taxrecords', 'Tax Records', 'financial', 'Financial', false, false),
('marketeer', 'budgets', 'Budgets', 'financial', 'Financial', false, false),
('marketeer', 'financialreports', 'Reports', 'financial', 'Financial', false, false),
-- Admin & Legal
('marketeer', 'legal', 'Legal', 'admin', 'Admin & Legal', true, false),
('marketeer', 'sitetext', 'Site Text', 'admin', 'Admin & Legal', false, false),
('marketeer', 'languages', 'Languages', 'admin', 'Admin & Legal', false, false),
('marketeer', 'passwords', 'Player Passwords', 'admin', 'Admin & Legal', false, false),
('marketeer', 'staffaccounts', 'Staff Accounts', 'admin', 'Admin & Legal', false, false),
('marketeer', 'pwainstall', 'PWA Install', 'admin', 'Admin & Legal', true, false),
('marketeer', 'offlinemanager', 'Offline Content', 'admin', 'Admin & Legal', true, false),
('marketeer', 'pushnotifications', 'Push Notifications', 'admin', 'Admin & Legal', false, false);