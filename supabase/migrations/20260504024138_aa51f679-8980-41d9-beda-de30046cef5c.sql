CREATE TABLE IF NOT EXISTS public.psychology_spq_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  player_name text NOT NULL,
  gender_norm text NOT NULL DEFAULT 'men' CHECK (gender_norm IN ('men', 'women')),
  age_band text,
  pasted_answers text,
  parsed_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  scale_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  factor_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_summary text,
  recommendations text,
  visual_one_url text,
  visual_two_url text,
  share_slug text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(10), 'hex'),
  is_shared boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.psychology_spq_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can create SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can edit SPQ reports" ON public.psychology_spq_reports;
DROP POLICY IF EXISTS "Staff can delete SPQ reports" ON public.psychology_spq_reports;

CREATE POLICY "Staff can view SPQ reports"
ON public.psychology_spq_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create SPQ reports"
ON public.psychology_spq_reports
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can edit SPQ reports"
ON public.psychology_spq_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can delete SPQ reports"
ON public.psychology_spq_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_psychology_spq_reports_player_id ON public.psychology_spq_reports(player_id);
CREATE INDEX IF NOT EXISTS idx_psychology_spq_reports_share_slug ON public.psychology_spq_reports(share_slug);

DROP TRIGGER IF EXISTS update_psychology_spq_reports_updated_at ON public.psychology_spq_reports;
CREATE TRIGGER update_psychology_spq_reports_updated_at
BEFORE UPDATE ON public.psychology_spq_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_shared_spq_report(_share_slug text)
RETURNS TABLE (
  id uuid,
  player_name text,
  gender_norm text,
  age_band text,
  scale_scores jsonb,
  factor_scores jsonb,
  report_summary text,
  recommendations text,
  visual_one_url text,
  visual_two_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.player_name,
    r.gender_norm,
    r.age_band,
    r.scale_scores,
    r.factor_scores,
    r.report_summary,
    r.recommendations,
    r.visual_one_url,
    r.visual_two_url,
    r.created_at
  FROM public.psychology_spq_reports r
  WHERE r.share_slug = _share_slug
    AND r.is_shared = true
  LIMIT 1;
$$;