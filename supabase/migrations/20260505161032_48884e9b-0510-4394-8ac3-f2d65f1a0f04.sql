DROP FUNCTION IF EXISTS public.get_shared_spq_report(text);
CREATE OR REPLACE FUNCTION public.get_shared_spq_report(_share_slug text)
 RETURNS TABLE(id uuid, player_name text, gender_norm text, age_band text, scale_scores jsonb, factor_scores jsonb, report_summary text, recommendations text, visual_one_url text, visual_two_url text, visual_three_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.player_name, r.gender_norm, r.age_band,
    r.scale_scores, r.factor_scores,
    r.report_summary, r.recommendations,
    r.visual_one_url, r.visual_two_url, r.visual_three_url,
    r.created_at
  FROM public.psychology_spq_reports r
  WHERE r.share_slug = _share_slug AND r.is_shared = true
  LIMIT 1;
$function$;