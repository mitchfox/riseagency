
CREATE OR REPLACE FUNCTION public.has_section_access(_user_id uuid, _section text, _require_edit boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = _user_id
      AND rp.section_id = _section
      AND (CASE WHEN _require_edit THEN rp.can_edit ELSE (rp.can_view OR rp.can_edit) END)
  )
$$;

CREATE POLICY "Section viewers can read market table entries"
  ON public.market_table_entries FOR SELECT TO authenticated
  USING (public.has_section_access(auth.uid(), 'markettables', false));

CREATE POLICY "Section editors can insert market table entries"
  ON public.market_table_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_section_access(auth.uid(), 'markettables', true));

CREATE POLICY "Section editors can update market table entries"
  ON public.market_table_entries FOR UPDATE TO authenticated
  USING (public.has_section_access(auth.uid(), 'markettables', true))
  WITH CHECK (public.has_section_access(auth.uid(), 'markettables', true));

CREATE POLICY "Section editors can delete market table entries"
  ON public.market_table_entries FOR DELETE TO authenticated
  USING (public.has_section_access(auth.uid(), 'markettables', true));

CREATE POLICY "Section editors can manage relationships"
  ON public.outreach_relationships FOR ALL TO authenticated
  USING (
    public.has_section_access(auth.uid(), 'markettables', true)
    OR public.has_section_access(auth.uid(), 'cluboutreach', true)
    OR public.has_section_access(auth.uid(), 'clubnetwork', true)
  )
  WITH CHECK (
    public.has_section_access(auth.uid(), 'markettables', true)
    OR public.has_section_access(auth.uid(), 'cluboutreach', true)
    OR public.has_section_access(auth.uid(), 'clubnetwork', true)
  );
