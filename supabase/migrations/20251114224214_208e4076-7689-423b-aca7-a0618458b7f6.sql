-- Create push notification tokens table
CREATE TABLE IF NOT EXISTS public.push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_push_tokens_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE,
  performance_reports BOOLEAN NOT NULL DEFAULT true,
  analyses BOOLEAN NOT NULL DEFAULT true,
  programmes BOOLEAN NOT NULL DEFAULT true,
  highlights BOOLEAN NOT NULL DEFAULT true,
  clips BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_notif_prefs_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.push_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_notification_tokens
CREATE POLICY "Players can manage their own tokens"
  ON public.push_notification_tokens
  FOR ALL
  USING (player_id IN (SELECT id FROM players WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Staff can view all tokens"
  ON public.push_notification_tokens
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for notification_preferences
CREATE POLICY "Players can manage their own preferences"
  ON public.notification_preferences
  FOR ALL
  USING (player_id IN (SELECT id FROM players WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Staff can view all preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_push_tokens_player_id ON public.push_notification_tokens(player_id);
CREATE INDEX idx_notif_prefs_player_id ON public.notification_preferences(player_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();