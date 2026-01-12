-- Drop the restrictive RLS policy and disable RLS on staff_sms_notifications
-- This table just logs notifications and doesn't contain sensitive data
DROP POLICY IF EXISTS "Admin can manage SMS notifications" ON public.staff_sms_notifications;
ALTER TABLE public.staff_sms_notifications DISABLE ROW LEVEL SECURITY;