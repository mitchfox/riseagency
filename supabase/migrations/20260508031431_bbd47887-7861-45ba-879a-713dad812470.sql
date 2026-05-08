
-- Seed missing role permission sections for every existing role
DO $$
DECLARE
  r RECORD;
  s RECORD;
BEGIN
  FOR r IN SELECT DISTINCT role FROM public.role_permissions LOOP
    FOR s IN
      SELECT * FROM (VALUES
        ('dashboard', 'Dashboard', 'overview', 'Overview'),
        ('visionboard', 'Vision Board', 'overview', 'Overview'),
        ('docs', 'Docs', 'apps', 'Apps'),
        ('sheets', 'Sheets', 'apps', 'Apps'),
        ('designstudio', 'Design Studio', 'apps', 'Apps'),
        ('annotations', 'Annotations', 'apps', 'Apps'),
        ('videoanalysis', 'Video Analysis', 'apps', 'Apps'),
        ('streams', 'Streams', 'apps', 'Apps'),
        ('videocompressor', 'Video Compressor', 'apps', 'Apps'),
        ('highlightcompiler', 'Highlight Compiler', 'apps', 'Apps'),
        ('musicstudio', 'Music Studio', 'apps', 'Apps'),
        ('coachingdata', 'Coaching Data', 'coaching', 'Coaching'),
        ('strengthpower', 'Strength, Power & Speed', 'coaching', 'Coaching'),
        ('nutrition', 'Nutrition', 'coaching', 'Coaching'),
        ('psychology', 'Psychology', 'coaching', 'Coaching'),
        ('requests', 'Requests', 'management', 'Management'),
        ('portalmanagement', 'Portal Management', 'management', 'Management'),
        ('interactionhistory', 'Interaction History', 'network', 'Network & Recruitment'),
        ('casestudies', 'Case Studies', 'network', 'Network & Recruitment'),
        ('transferreports', 'Transfer Reports', 'network', 'Network & Recruitment'),
        ('marketingschedule', 'Marketing Schedule', 'marketing', 'Marketing & Brand'),
        ('publiccontent', 'Public Content', 'marketing', 'Marketing & Brand'),
        ('salesdeck', 'Sales Deck', 'marketing', 'Marketing & Brand'),
        ('smsnotifications', 'SMS Notifications', 'admin', 'Admin & Legal'),
        ('activitylog', 'Activity Log', 'admin', 'Admin & Legal'),
        ('dataexport', 'Data Export', 'admin', 'Admin & Legal'),
        ('datasetbuilder', 'Dataset Builder', 'admin', 'Admin & Legal'),
        ('usage', 'Usage', 'admin', 'Admin & Legal'),
        ('partners', 'Partners', 'admin', 'Admin & Legal'),
        ('jobs', 'Jobs', 'admin', 'Admin & Legal'),
        ('corporationtax', 'Corporation Tax', 'financial', 'Financial')
      ) AS t(section_id, section_title, category_id, category_title)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = r.role AND section_id = s.section_id
      ) THEN
        INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit)
        VALUES (
          r.role,
          s.section_id,
          s.section_title,
          s.category_id,
          s.category_title,
          r.role = 'admin',
          r.role = 'admin'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Allow renaming a role's display label/description without changing the key
CREATE OR REPLACE FUNCTION public.update_role_label(_role_key text, _label text, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.available_roles
  SET role_label = COALESCE(NULLIF(_label, ''), role_label),
      description = _description
  WHERE role_key = _role_key;
END;
$$;
