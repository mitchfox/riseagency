
CREATE TABLE public.visitor_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name TEXT,
  user_agent TEXT,
  platform TEXT,
  is_pwa BOOLEAN DEFAULT false,
  is_standalone BOOLEAN DEFAULT false,
  is_ios BOOLEAN DEFAULT false,
  is_android BOOLEAN DEFAULT false,
  service_worker_status TEXT,
  display_mode TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  device_pixel_ratio NUMERIC,
  viewport_width INTEGER,
  viewport_height INTEGER,
  online BOOLEAN DEFAULT true,
  connection_type TEXT,
  cookies_enabled BOOLEAN,
  local_storage_available BOOLEAN,
  pwa_last_route TEXT,
  pwa_last_scope TEXT,
  cache_names TEXT[],
  sw_version TEXT,
  errors TEXT[],
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert diagnostics (public page)
CREATE POLICY "Anyone can submit diagnostics" ON public.visitor_diagnostics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only authenticated users can read diagnostics
CREATE POLICY "Authenticated users can read diagnostics" ON public.visitor_diagnostics
  FOR SELECT TO authenticated USING (true);
