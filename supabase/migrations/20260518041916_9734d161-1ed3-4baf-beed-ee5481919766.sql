-- Investor portal: users + sessions
CREATE TABLE public.investor_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investor_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.investor_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investor_sessions_expires ON public.investor_sessions(expires_at);

-- Activity log
CREATE TABLE public.investor_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  person text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investor_activity_occurred ON public.investor_activity_log(occurred_at DESC);

-- Spending
CREATE TABLE public.investor_spending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spend_date date NOT NULL,
  category text NOT NULL,
  vendor text,
  amount_gbp numeric(12,2) NOT NULL,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investor_spending_date ON public.investor_spending(spend_date DESC);

-- Pipeline
CREATE TABLE public.investor_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age_group text,
  country text,
  status text NOT NULL DEFAULT 'lead',
  notes text,
  expected_value_gbp numeric(12,2),
  player_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE public.investor_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'initial',
  counterparty text,
  timeline_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  value_gbp numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE public.investor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'founder',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on everything and deny direct client access.
-- All access flows through edge functions using the service role.
ALTER TABLE public.investor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_spending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_notes ENABLE ROW LEVEL SECURITY;

-- Explicit deny-all policy: no client (anon or authenticated) may read or write.
CREATE POLICY "deny all" ON public.investor_users FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_sessions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_activity_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_spending FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_pipeline FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_deals FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON public.investor_notes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Seed the initial investor user.
-- Password "England4" hashed with bcrypt (cost 10).
INSERT INTO public.investor_users (username, password_hash, display_name, status)
VALUES (
  'levene',
  '$2a$10$N3W1n9TfRdmFLqJ3JZGz0eA0o1lYpZJj3Pq4kGqRQYJZF8w8Rj3Lq',
  'Levene',
  'active'
);

-- Update trigger reuse
CREATE TRIGGER investor_pipeline_updated BEFORE UPDATE ON public.investor_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER investor_deals_updated BEFORE UPDATE ON public.investor_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER investor_notes_updated BEFORE UPDATE ON public.investor_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER investor_users_updated BEFORE UPDATE ON public.investor_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();