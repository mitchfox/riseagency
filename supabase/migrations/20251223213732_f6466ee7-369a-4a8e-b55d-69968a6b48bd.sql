-- Create table for role-based notification settings (admin can configure which roles see which notifications)
CREATE TABLE public.staff_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, event_type)
);

-- Enable RLS
ALTER TABLE public.staff_notification_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notification settings
CREATE POLICY "Admins can manage notification settings"
ON public.staff_notification_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Staff can view notification settings for their role
CREATE POLICY "Staff can view their role notification settings"
ON public.staff_notification_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = staff_notification_settings.role
  )
);

-- Add read status to staff_notification_events
ALTER TABLE public.staff_notification_events 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_notification_events_created_at 
ON public.staff_notification_events(created_at DESC);

-- Add RLS to staff_notification_events if not already enabled
ALTER TABLE public.staff_notification_events ENABLE ROW LEVEL SECURITY;

-- Policy for staff to view notifications
CREATE POLICY "Staff can view notifications"
ON public.staff_notification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Policy for staff to update read status
CREATE POLICY "Staff can mark notifications as read"
ON public.staff_notification_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Insert default notification settings for all roles and event types
INSERT INTO public.staff_notification_settings (role, event_type, enabled) VALUES
  ('admin', 'visitor', true),
  ('admin', 'form_submission', true),
  ('admin', 'clip_upload', true),
  ('admin', 'playlist_change', true),
  ('staff', 'visitor', true),
  ('staff', 'form_submission', true),
  ('staff', 'clip_upload', true),
  ('staff', 'playlist_change', true),
  ('marketeer', 'visitor', false),
  ('marketeer', 'form_submission', true),
  ('marketeer', 'clip_upload', false),
  ('marketeer', 'playlist_change', false)
ON CONFLICT (role, event_type) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_staff_notification_settings_updated_at
BEFORE UPDATE ON public.staff_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();