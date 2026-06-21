
-- 1. Add enum value
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing_gallery';

-- 2. Register role for admin UI
INSERT INTO public.available_roles (role_key, role_label, description)
VALUES ('marketing_gallery', 'Marketing Gallery', 'Read-only access to the marketing gallery. Can view and download images and videos, but cannot upload, edit, or access anything else.')
ON CONFLICT (role_key) DO UPDATE
  SET role_label = EXCLUDED.role_label,
      description = EXCLUDED.description;

-- 3. Grant only the gallery section
INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit)
VALUES ('marketing_gallery', 'marketinggallery', 'Marketing Gallery', 'marketing', 'Marketing & Brand', true, false)
ON CONFLICT DO NOTHING;
