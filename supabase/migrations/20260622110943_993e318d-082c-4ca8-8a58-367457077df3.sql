CREATE TABLE IF NOT EXISTS public.staff_view_as_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text,
  target_user_id uuid NOT NULL,
  target_email text,
  reason text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_view_as_log TO authenticated;
GRANT ALL ON public.staff_view_as_log TO service_role;
ALTER TABLE public.staff_view_as_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read view-as log" ON public.staff_view_as_log;
CREATE POLICY "Admins read view-as log" ON public.staff_view_as_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_staff_view_as_log_created_at ON public.staff_view_as_log (created_at DESC);