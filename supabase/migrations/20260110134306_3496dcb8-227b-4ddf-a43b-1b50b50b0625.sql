-- Add phone_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create marketing_tips table for tips, ideas and lessons
CREATE TABLE public.marketing_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'tip',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on marketing_tips
ALTER TABLE public.marketing_tips ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_tips - staff can view, admin can manage
CREATE POLICY "Staff can view marketing tips" 
ON public.marketing_tips 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff', 'marketeer')
  )
);

CREATE POLICY "Admin can manage marketing tips" 
ON public.marketing_tips 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create staff_sms_notifications table for personal messages
CREATE TABLE public.staff_sms_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  sent_to UUID[] NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

-- Enable RLS on staff_sms_notifications
ALTER TABLE public.staff_sms_notifications ENABLE ROW LEVEL SECURITY;

-- Only admin can manage SMS notifications
CREATE POLICY "Admin can manage SMS notifications" 
ON public.staff_sms_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add trigger for updated_at on marketing_tips
CREATE TRIGGER update_marketing_tips_updated_at
  BEFORE UPDATE ON public.marketing_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add marketing_tip_new to notification settings options
INSERT INTO public.staff_notification_settings (role, event_type, enabled)
SELECT 'admin', 'marketing_tip_new', true WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_notification_settings WHERE role = 'admin' AND event_type = 'marketing_tip_new'
);
INSERT INTO public.staff_notification_settings (role, event_type, enabled)
SELECT 'staff', 'marketing_tip_new', true WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_notification_settings WHERE role = 'staff' AND event_type = 'marketing_tip_new'
);
INSERT INTO public.staff_notification_settings (role, event_type, enabled)
SELECT 'marketeer', 'marketing_tip_new', true WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_notification_settings WHERE role = 'marketeer' AND event_type = 'marketing_tip_new'
);