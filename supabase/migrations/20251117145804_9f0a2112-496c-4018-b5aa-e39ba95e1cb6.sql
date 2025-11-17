-- Create function to notify on new player analysis
CREATE OR REPLACE FUNCTION notify_new_player_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload json;
BEGIN
  -- Only notify for new records
  IF TG_OP = 'INSERT' THEN
    payload := json_build_object('record', row_to_json(NEW));
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-analysis',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )::jsonb,
      body := payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for player_analysis
DROP TRIGGER IF EXISTS trigger_notify_new_player_analysis ON player_analysis;
CREATE TRIGGER trigger_notify_new_player_analysis
  AFTER INSERT ON player_analysis
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_player_analysis();

-- Create function to notify on new program
CREATE OR REPLACE FUNCTION notify_new_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload json;
BEGIN
  -- Only notify for new records
  IF TG_OP = 'INSERT' THEN
    payload := json_build_object('record', row_to_json(NEW));
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-program',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )::jsonb,
      body := payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for player_programs
DROP TRIGGER IF EXISTS trigger_notify_new_program ON player_programs;
CREATE TRIGGER trigger_notify_new_program
  AFTER INSERT ON player_programs
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_program();

-- Create function to notify on new update
CREATE OR REPLACE FUNCTION notify_new_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload json;
BEGIN
  -- Only notify for new visible updates
  IF TG_OP = 'INSERT' AND NEW.visible = true AND array_length(NEW.visible_to_player_ids, 1) > 0 THEN
    payload := json_build_object('record', row_to_json(NEW));
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-update',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )::jsonb,
      body := payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updates
DROP TRIGGER IF EXISTS trigger_notify_new_update ON updates;
CREATE TRIGGER trigger_notify_new_update
  AFTER INSERT ON updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_update();

-- Create function to notify on new concept analysis
CREATE OR REPLACE FUNCTION notify_new_concept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload json;
BEGIN
  -- Only notify for new concept analyses
  IF TG_OP = 'INSERT' AND NEW.analysis_type = 'concept' THEN
    payload := json_build_object('record', row_to_json(NEW));
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-concept',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )::jsonb,
      body := payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for analyses (concepts)
DROP TRIGGER IF EXISTS trigger_notify_new_concept ON analyses;
CREATE TRIGGER trigger_notify_new_concept
  AFTER INSERT ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_concept();