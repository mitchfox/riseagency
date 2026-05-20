
-- =========================================================================
-- 1. Stars on templates so admins can choose which to surface to investors
-- =========================================================================
ALTER TABLE public.whatsapp_quick_messages
  ADD COLUMN IF NOT EXISTS show_on_investor_portal boolean NOT NULL DEFAULT false;

-- =========================================================================
-- 2. Investor Capacity (Operations)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.investor_capacity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  mode text NOT NULL DEFAULT 'week', -- 'week' | 'day'
  weekly_hours_total numeric NOT NULL DEFAULT 40,
  daily_hours jsonb NOT NULL DEFAULT '{"mon":8,"tue":8,"wed":8,"thu":8,"fri":8,"sat":0,"sun":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investor_capacity_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_item_id uuid REFERENCES public.investor_time_items(id) ON DELETE CASCADE,
  custom_label text,
  player_type text NOT NULL CHECK (player_type IN ('youth','pro')),
  hours_per_week numeric NOT NULL DEFAULT 1,
  day_of_week text, -- 'mon'..'sun' or NULL for week mode
  display_order int NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_capacity_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Capacity settings readable by all" ON public.investor_capacity_settings FOR SELECT USING (true);
CREATE POLICY "Capacity settings admin write" ON public.investor_capacity_settings FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Capacity allocations readable by all" ON public.investor_capacity_allocations FOR SELECT USING (true);
CREATE POLICY "Capacity allocations admin write" ON public.investor_capacity_allocations FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Seed singleton
INSERT INTO public.investor_capacity_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- =========================================================================
-- 3. Executive Support items + replies
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exec_support_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('note','script','workflow')),
  title text,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open', -- 'open' | 'resolved'
  author_label text, -- display name (anonymous to investor portal sessions)
  created_by_admin boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exec_support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.exec_support_items(id) ON DELETE CASCADE,
  author_label text,
  body_text text,
  audio_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exec_support_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_support_replies ENABLE ROW LEVEL SECURITY;

-- Investors authenticate via session token through the edge function (service role).
-- Direct SELECT is allowed for anyone (read-only); writes go through edge functions.
CREATE POLICY "Exec items readable" ON public.exec_support_items FOR SELECT USING (true);
CREATE POLICY "Exec items admin write" ON public.exec_support_items FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Exec replies readable" ON public.exec_support_replies FOR SELECT USING (true);
CREATE POLICY "Exec replies admin write" ON public.exec_support_replies FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_exec_items_kind ON public.exec_support_items(kind, display_order);
CREATE INDEX IF NOT EXISTS idx_exec_replies_item ON public.exec_support_replies(item_id, created_at);
