-- Add end_date column for multi-day events
ALTER TABLE public.staff_calendar_events 
ADD COLUMN end_date date DEFAULT NULL;