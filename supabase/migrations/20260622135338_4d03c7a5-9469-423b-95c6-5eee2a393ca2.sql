ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'table_editor';

INSERT INTO public.available_roles (role_key, role_label, description)
VALUES ('table_editor', 'Table Editor', 'Can only view and edit Market Tables')
ON CONFLICT (role_key) DO UPDATE SET role_label = EXCLUDED.role_label, description = EXCLUDED.description;

INSERT INTO public.role_permissions (role, section_id, section_title, category_id, category_title, can_view, can_edit)
VALUES ('table_editor', 'markettables', 'Market Tables', 'network', 'Network & Recruitment', true, true)
ON CONFLICT (role, section_id) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit, section_title = EXCLUDED.section_title, category_id = EXCLUDED.category_id, category_title = EXCLUDED.category_title;