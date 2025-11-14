-- Create table for web push subscriptions
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own subscriptions"
  ON public.web_push_subscriptions
  FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Users can insert own subscriptions"
  ON public.web_push_subscriptions
  FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Users can update own subscriptions"
  ON public.web_push_subscriptions
  FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- Create table for storing VAPID keys (auto-generated)
CREATE TABLE IF NOT EXISTS public.push_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (only accessible via edge functions)
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_web_push_subscriptions_updated_at
  BEFORE UPDATE ON public.web_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();