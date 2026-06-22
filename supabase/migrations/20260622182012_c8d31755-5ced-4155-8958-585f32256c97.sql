
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_sessions ON public.sps_sessions;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_exercises ON public.sps_exercises;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_sessions ON public.technical_sessions;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_drills ON public.technical_drills;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_drill_variations ON public.technical_drill_variations;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_performance_report_actions ON public.performance_report_actions;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_player_programs ON public.player_programs;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_sps_programs ON public.sps_programs;
DROP TRIGGER IF EXISTS trg_guard_bulk_delete_technical_programs ON public.technical_programs;

DROP FUNCTION IF EXISTS public.guard_bulk_delete();
DROP FUNCTION IF EXISTS public.guard_require_allow_clear_for_delete();
