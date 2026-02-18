
-- Create player portal settings table for controlling feature visibility and hero images
CREATE TABLE public.player_portal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  -- Feature visibility toggles (all default to true/visible)
  show_hub BOOLEAN NOT NULL DEFAULT true,
  show_analysis BOOLEAN NOT NULL DEFAULT true,
  show_programming BOOLEAN NOT NULL DEFAULT true,
  show_nutrition BOOLEAN NOT NULL DEFAULT true,
  show_highlights BOOLEAN NOT NULL DEFAULT true,
  show_transfer_hub BOOLEAN NOT NULL DEFAULT true,
  show_key_documents BOOLEAN NOT NULL DEFAULT true,
  show_updates BOOLEAN NOT NULL DEFAULT true,
  show_view_profile BOOLEAN NOT NULL DEFAULT true,
  show_countdown BOOLEAN NOT NULL DEFAULT true,
  show_comparisons BOOLEAN NOT NULL DEFAULT true,
  show_scouting BOOLEAN NOT NULL DEFAULT true,
  show_cognisance BOOLEAN NOT NULL DEFAULT true,
  show_injury_log BOOLEAN NOT NULL DEFAULT true,
  -- Hero image settings
  hero_images JSONB DEFAULT '[]'::jsonb,
  hero_focal_points JSONB DEFAULT '[]'::jsonb,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.player_portal_settings ENABLE ROW LEVEL SECURITY;

-- Staff can read/write all settings
CREATE POLICY "Authenticated users can view portal settings"
ON public.player_portal_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert portal settings"
ON public.player_portal_settings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update portal settings"
ON public.player_portal_settings FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete portal settings"
ON public.player_portal_settings FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Auto-update timestamp
CREATE TRIGGER update_player_portal_settings_updated_at
BEFORE UPDATE ON public.player_portal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
