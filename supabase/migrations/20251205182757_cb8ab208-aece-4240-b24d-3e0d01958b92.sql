-- Create staff calendar events table for personal staff schedules
CREATE TABLE public.staff_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME,
  end_time TIME,
  event_type TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_calendar_events ENABLE ROW LEVEL SECURITY;

-- Staff can view all events (they need to see each other's schedules)
CREATE POLICY "Staff can view all calendar events"
ON public.staff_calendar_events
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can manage their own events
CREATE POLICY "Staff can manage their own calendar events"
ON public.staff_calendar_events
FOR ALL
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Admin can manage all events
CREATE POLICY "Admin can manage all calendar events"
ON public.staff_calendar_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_staff_calendar_events_updated_at
BEFORE UPDATE ON public.staff_calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();