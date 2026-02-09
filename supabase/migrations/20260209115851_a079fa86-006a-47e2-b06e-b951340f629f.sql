-- 1. Enable RLS on staff_sms_notifications (the only table with RLS disabled)
ALTER TABLE public.staff_sms_notifications ENABLE ROW LEVEL SECURITY;

-- Staff/admin can do everything on staff_sms_notifications
CREATE POLICY "Authenticated users can manage staff_sms_notifications"
  ON public.staff_sms_notifications
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix club_map_positions - drop overly restrictive policies and replace with simple authenticated access
DROP POLICY IF EXISTS "Staff can manage club_map_positions" ON public.club_map_positions;
DROP POLICY IF EXISTS "Staff can view club map positions" ON public.club_map_positions;
DROP POLICY IF EXISTS "Admin can manage club map positions" ON public.club_map_positions;

CREATE POLICY "Authenticated users can view club_map_positions"
  ON public.club_map_positions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage club_map_positions"
  ON public.club_map_positions
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
