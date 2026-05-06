DROP POLICY IF EXISTS "Staff can manage form config" ON public.player_form_config;
DROP POLICY IF EXISTS "Staff can manage hudl visibility" ON public.player_hudl_visibility;

CREATE POLICY "Player database editors can manage form config"
ON public.player_form_config
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.section_id IN ('playerdatabase', 'players')
      AND rp.can_edit = true
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.section_id IN ('playerdatabase', 'players')
      AND rp.can_edit = true
  )
);

CREATE POLICY "Player database editors can manage hudl visibility"
ON public.player_hudl_visibility
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.section_id IN ('playerdatabase', 'players')
      AND rp.can_edit = true
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.section_id IN ('playerdatabase', 'players')
      AND rp.can_edit = true
  )
);