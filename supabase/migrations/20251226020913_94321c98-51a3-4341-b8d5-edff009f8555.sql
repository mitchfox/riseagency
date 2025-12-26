-- Create function to log site visit notifications
CREATE OR REPLACE FUNCTION public.log_site_visit_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_notification_events (event_type, title, body, event_data)
  VALUES (
    'visitor',
    'New Site Visitor',
    'Visited ' || NEW.page_path,
    jsonb_build_object(
      'page', NEW.page_path,
      'visitor_id', NEW.visitor_id,
      'user_agent', NEW.user_agent,
      'referrer', NEW.referrer
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for site visits
DROP TRIGGER IF EXISTS trigger_site_visit_notification ON public.site_visits;
CREATE TRIGGER trigger_site_visit_notification
  AFTER INSERT ON public.site_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.log_site_visit_notification();

-- Create function to log form submission notifications
CREATE OR REPLACE FUNCTION public.log_form_submission_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_notification_events (event_type, title, body, event_data)
  VALUES (
    'form_submission',
    'New Form Submission',
    NEW.form_type || ' form submitted',
    jsonb_build_object(
      'form_type', NEW.form_type,
      'form_id', NEW.id,
      'data', NEW.data
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for form submissions
DROP TRIGGER IF EXISTS trigger_form_submission_notification ON public.form_submissions;
CREATE TRIGGER trigger_form_submission_notification
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_form_submission_notification();

-- Create function to log playlist change notifications
CREATE OR REPLACE FUNCTION public.log_playlist_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  event_name TEXT;
  playlist_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_name := 'created';
    playlist_name := NEW.name;
  ELSIF TG_OP = 'UPDATE' THEN
    event_name := 'updated';
    playlist_name := NEW.name;
  ELSIF TG_OP = 'DELETE' THEN
    event_name := 'deleted';
    playlist_name := OLD.name;
  END IF;
  
  INSERT INTO public.staff_notification_events (event_type, title, body, event_data)
  VALUES (
    'playlist_change',
    'Playlist ' || INITCAP(event_name),
    'Playlist: ' || playlist_name,
    jsonb_build_object(
      'event', event_name,
      'playlist_name', playlist_name,
      'playlist_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for playlist changes
DROP TRIGGER IF EXISTS trigger_playlist_change_notification ON public.playlists;
CREATE TRIGGER trigger_playlist_change_notification
  AFTER INSERT OR UPDATE OR DELETE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.log_playlist_change_notification();

-- Create function to log player highlights/clip upload notifications
CREATE OR REPLACE FUNCTION public.log_clip_upload_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if highlights changed
  IF OLD.highlights IS DISTINCT FROM NEW.highlights THEN
    INSERT INTO public.staff_notification_events (event_type, title, body, event_data)
    VALUES (
      'clip_upload',
      'Clip Updated',
      'Highlights updated for ' || NEW.name,
      jsonb_build_object(
        'player_id', NEW.id,
        'player_name', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for clip uploads (player highlights)
DROP TRIGGER IF EXISTS trigger_clip_upload_notification ON public.players;
CREATE TRIGGER trigger_clip_upload_notification
  AFTER UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.log_clip_upload_notification();

-- Enable realtime for staff_notification_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_notification_events;