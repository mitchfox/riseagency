-- Create staff_web_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.staff_web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.staff_web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own subscriptions
CREATE POLICY "Staff can view own subscription"
  ON public.staff_web_push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can insert own subscription"
  ON public.staff_web_push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can update own subscription"
  ON public.staff_web_push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can delete own subscription"
  ON public.staff_web_push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_staff_web_push_subscriptions_updated_at
  BEFORE UPDATE ON public.staff_web_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification_events table to track what was sent
CREATE TABLE IF NOT EXISTS public.staff_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification events (staff only)
ALTER TABLE public.staff_notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notification events"
  ON public.staff_notification_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));