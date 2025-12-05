-- Add day_of_week column for weekly recurring events (0=Sunday, 1=Monday, ... 6=Saturday)
ALTER TABLE public.staff_calendar_events 
ADD COLUMN day_of_week integer;