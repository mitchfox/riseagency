-- Create table for tracking which stats each player wants hidden
CREATE TABLE IF NOT EXISTS public.player_hidden_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  stat_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, stat_key)
);

-- Enable RLS
ALTER TABLE public.player_hidden_stats ENABLE ROW LEVEL SECURITY;

-- Staff can manage all hidden stats
CREATE POLICY "Staff can manage player_hidden_stats"
  ON public.player_hidden_stats
  FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Players can manage their own hidden stats
CREATE POLICY "Players can manage their own hidden stats"
  ON public.player_hidden_stats
  FOR ALL
  USING (player_id IN (
    SELECT id FROM public.players WHERE email = (auth.jwt()->>'email')::text
  ));