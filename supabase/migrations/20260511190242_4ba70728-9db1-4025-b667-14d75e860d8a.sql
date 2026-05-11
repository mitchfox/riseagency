
-- 1. Staff player assignments (stats updater scoping)
CREATE TABLE IF NOT EXISTS public.staff_player_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  role_key TEXT NOT NULL DEFAULT 'stats_updater',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id, role_key)
);
ALTER TABLE public.staff_player_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read assignments" ON public.staff_player_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage assignments insert" ON public.staff_player_assignments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage assignments update" ON public.staff_player_assignments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage assignments delete" ON public.staff_player_assignments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Open select policy (mirrors project pattern of public select for staff data) for non-jwt staff reads
CREATE POLICY "Open assignments select" ON public.staff_player_assignments
  FOR SELECT USING (true);
CREATE POLICY "Open assignments insert" ON public.staff_player_assignments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Open assignments delete" ON public.staff_player_assignments
  FOR DELETE USING (true);

CREATE INDEX idx_staff_player_assignments_user ON public.staff_player_assignments(user_id);
CREATE INDEX idx_staff_player_assignments_player ON public.staff_player_assignments(player_id);

-- 2. Messaging Scripts
CREATE TABLE IF NOT EXISTS public.messaging_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messaging_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open scripts select" ON public.messaging_scripts FOR SELECT USING (true);
CREATE POLICY "Open scripts insert" ON public.messaging_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Open scripts update" ON public.messaging_scripts FOR UPDATE USING (true);
CREATE POLICY "Open scripts delete" ON public.messaging_scripts FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.messaging_script_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.messaging_scripts(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES public.messaging_script_nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'step',
  branch_label TEXT,
  content TEXT,
  optional BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messaging_script_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open script_nodes select" ON public.messaging_script_nodes FOR SELECT USING (true);
CREATE POLICY "Open script_nodes insert" ON public.messaging_script_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Open script_nodes update" ON public.messaging_script_nodes FOR UPDATE USING (true);
CREATE POLICY "Open script_nodes delete" ON public.messaging_script_nodes FOR DELETE USING (true);
CREATE INDEX idx_msg_nodes_script ON public.messaging_script_nodes(script_id);
CREATE INDEX idx_msg_nodes_parent ON public.messaging_script_nodes(parent_node_id);

CREATE TABLE IF NOT EXISTS public.messaging_script_objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.messaging_scripts(id) ON DELETE CASCADE,
  objection TEXT NOT NULL,
  response TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messaging_script_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open objections select" ON public.messaging_script_objections FOR SELECT USING (true);
CREATE POLICY "Open objections insert" ON public.messaging_script_objections FOR INSERT WITH CHECK (true);
CREATE POLICY "Open objections update" ON public.messaging_script_objections FOR UPDATE USING (true);
CREATE POLICY "Open objections delete" ON public.messaging_script_objections FOR DELETE USING (true);

CREATE TRIGGER trg_messaging_scripts_updated BEFORE UPDATE ON public.messaging_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_messaging_script_nodes_updated BEFORE UPDATE ON public.messaging_script_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_messaging_script_objections_updated BEFORE UPDATE ON public.messaging_script_objections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Player offer settings (RiseWithUs page customisation)
CREATE TABLE IF NOT EXISTS public.player_offer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE,
  hidden_sections TEXT[] NOT NULL DEFAULT '{}',
  section_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.player_offer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read offer settings" ON public.player_offer_settings FOR SELECT USING (true);
CREATE POLICY "Open offer settings insert" ON public.player_offer_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Open offer settings update" ON public.player_offer_settings FOR UPDATE USING (true);
CREATE POLICY "Open offer settings delete" ON public.player_offer_settings FOR DELETE USING (true);

CREATE TRIGGER trg_player_offer_settings_updated BEFORE UPDATE ON public.player_offer_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
