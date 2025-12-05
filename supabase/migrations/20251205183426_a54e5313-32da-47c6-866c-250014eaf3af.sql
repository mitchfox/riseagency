-- Add is_ongoing and category columns to staff_calendar_events
ALTER TABLE public.staff_calendar_events 
ADD COLUMN is_ongoing boolean DEFAULT false,
ADD COLUMN category text DEFAULT 'work';