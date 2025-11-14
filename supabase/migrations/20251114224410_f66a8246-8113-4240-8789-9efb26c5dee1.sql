-- Function to trigger push notifications
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_data jsonb;
  player_uuid uuid;
  notification_type text;
  notification_title text;
  notification_body text;
BEGIN
  -- Determine the player_id and notification details based on the table
  IF TG_TABLE_NAME = 'player_analysis' THEN
    player_uuid := NEW.player_id;
    notification_type := 'performance_reports';
    notification_title := 'New Performance Report';
    notification_body := 'A new performance analysis has been added to your portal';
  ELSIF TG_TABLE_NAME = 'analyses' AND NEW.analysis_type = 'concept' THEN
    -- For concepts, find all players who have this analysis linked
    SELECT player_id INTO player_uuid
    FROM player_analysis
    WHERE analysis_writer_id = NEW.id
    LIMIT 1;
    notification_type := 'analyses';
    notification_title := 'New Concept Analysis';
    notification_body := 'A new concept has been added: ' || COALESCE(NEW.title, 'Untitled');
  ELSIF TG_TABLE_NAME = 'player_programs' THEN
    player_uuid := NEW.player_id;
    notification_type := 'programmes';
    notification_title := 'New Training Programme';
    notification_body := 'A new training programme has been added: ' || NEW.program_name;
  ELSIF TG_TABLE_NAME = 'players' AND (NEW.highlights IS NOT NULL AND NEW.highlights::jsonb != OLD.highlights::jsonb) THEN
    player_uuid := NEW.id;
    notification_type := 'highlights';
    notification_title := 'New Highlight Added';
    notification_body := 'A new highlight clip has been added to your profile';
  END IF;

  -- Only proceed if we have a player_id
  IF player_uuid IS NOT NULL THEN
    -- Call the edge function to send push notification
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'player_id', player_uuid,
        'notification_type', notification_type,
        'title', notification_title,
        'body', notification_body,
        'data', jsonb_build_object(
          'table', TG_TABLE_NAME,
          'record_id', NEW.id
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for each table
CREATE TRIGGER notify_on_player_analysis_insert
  AFTER INSERT ON public.player_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

CREATE TRIGGER notify_on_analysis_insert
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

CREATE TRIGGER notify_on_player_program_insert
  AFTER INSERT ON public.player_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

CREATE TRIGGER notify_on_player_highlights_update
  AFTER UPDATE ON public.players
  FOR EACH ROW
  WHEN (NEW.highlights IS DISTINCT FROM OLD.highlights)
  EXECUTE FUNCTION public.trigger_push_notification();