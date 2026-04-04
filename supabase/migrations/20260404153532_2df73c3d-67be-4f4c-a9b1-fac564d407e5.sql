-- Add header feature permission entries for all existing roles
INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit)
SELECT r.role_key, s.section_id, s.section_title, 'header' as category_id, 'Header Features' as category_title,
  CASE WHEN r.role_key = 'admin' THEN true ELSE true END as can_view,
  CASE WHEN r.role_key = 'admin' THEN true ELSE false END as can_edit
FROM available_roles r
CROSS JOIN (
  VALUES 
    ('header_music', 'Music Player'),
    ('header_search', 'Search'),
    ('header_notifications', 'Notifications')
) s(section_id, section_title)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp 
  WHERE rp.role = r.role_key AND rp.section_id = s.section_id
);