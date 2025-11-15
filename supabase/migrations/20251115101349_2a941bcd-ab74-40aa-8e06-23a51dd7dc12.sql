-- Drop all triggers that depend on the function
DROP TRIGGER IF EXISTS notify_on_player_analysis_insert ON public.player_analysis CASCADE;
DROP TRIGGER IF EXISTS notify_on_analysis_insert ON public.analyses CASCADE;
DROP TRIGGER IF EXISTS notify_on_player_program_insert ON public.player_programs CASCADE;
DROP TRIGGER IF EXISTS notify_on_player_highlights_update ON public.players CASCADE;

-- Now drop the function with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS public.trigger_push_notification() CASCADE;