
-- 1. Add players.created_by so Members can be scoped to their own uploads
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Member RLS: only their own players (admin/staff policies remain unchanged)
DROP POLICY IF EXISTS "Members view own players" ON public.players;
DROP POLICY IF EXISTS "Members insert own players" ON public.players;
DROP POLICY IF EXISTS "Members update own players" ON public.players;
DROP POLICY IF EXISTS "Members delete own players" ON public.players;

CREATE POLICY "Members view own players" ON public.players FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'member'::app_role) AND created_by = auth.uid());

CREATE POLICY "Members insert own players" ON public.players FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'member'::app_role) AND created_by = auth.uid());

CREATE POLICY "Members update own players" ON public.players FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'member'::app_role) AND created_by = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'member'::app_role) AND created_by = auth.uid());

CREATE POLICY "Members delete own players" ON public.players FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'member'::app_role) AND created_by = auth.uid());

-- Grant Member role access to Player Management section
UPDATE public.role_permissions SET can_view = true, can_edit = true
WHERE role = 'member' AND section_id IN ('players','playerdatabase');

-- 2. Multi reference images for AI identification
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS identification_reference_images text[] NOT NULL DEFAULT '{}';

-- 3. Custom player categories (dynamic, replaces hardcoded check constraint)
CREATE TABLE IF NOT EXISTS public.player_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view categories" ON public.player_categories;
DROP POLICY IF EXISTS "Staff manage categories" ON public.player_categories;

CREATE POLICY "Authenticated can view categories" ON public.player_categories
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manage categories" ON public.player_categories
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'staff'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.player_categories (name, sort_order, is_system) VALUES
  ('Signed', 10, true),
  ('Mandate', 20, true),
  ('Fuel For Football', 30, true),
  ('Previously Mandated', 40, true),
  ('Scouted', 50, true),
  ('Other', 60, true)
ON CONFLICT (name) DO NOTHING;

-- Drop the hardcoded category check so custom categories can be saved
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_category_check;

CREATE TRIGGER trg_player_categories_updated_at
  BEFORE UPDATE ON public.player_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Loosen SPQ RLS so any authenticated staff portal user can save SPQs
DROP POLICY IF EXISTS "Staff can create SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can edit SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can delete SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can view SPQ reports" ON public.psychology_spq_reports;

CREATE POLICY "Authenticated view SPQ reports" ON public.psychology_spq_reports
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert SPQ reports" ON public.psychology_spq_reports
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update SPQ reports" ON public.psychology_spq_reports
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete SPQ reports" ON public.psychology_spq_reports
FOR DELETE TO authenticated USING (true);
