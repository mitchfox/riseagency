-- Update the trigger function to include location data in visitor notifications
CREATE OR REPLACE FUNCTION public.log_site_visit_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'referrer', NEW.referrer,
      'location', NEW.location
    )
  );
  RETURN NEW;
END;
$function$;