-- Create homepage_videos table for managing videos shown on homepage
CREATE TABLE IF NOT EXISTS public.homepage_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_name TEXT NOT NULL DEFAULT '3D Portfolio',
  video_url TEXT NOT NULL,
  video_title TEXT NOT NULL,
  order_position INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access for homepage videos
CREATE POLICY "Homepage videos are viewable by everyone"
  ON public.homepage_videos
  FOR SELECT
  USING (is_active = true);

-- Allow staff to manage homepage videos (assumes staff authentication)
CREATE POLICY "Staff can manage homepage videos"
  ON public.homepage_videos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_homepage_videos_active_order ON public.homepage_videos(is_active, order_position);

-- Add trigger for updated_at
CREATE TRIGGER update_homepage_videos_updated_at
  BEFORE UPDATE ON public.homepage_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default videos from current hardcoded ones
INSERT INTO public.homepage_videos (video_url, video_title, order_position) VALUES
  ('https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0', 'Video 1', 1),
  ('https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0', 'Video 2', 2),
  ('https://www.youtube.com/embed/N58wQGqq3vo?autoplay=1&mute=1&controls=0&loop=1&playlist=N58wQGqq3vo&modestbranding=1&rel=0', 'Video 3', 3),
  ('https://www.youtube.com/embed/kDPvZexzvkM?autoplay=1&mute=1&controls=0&loop=1&playlist=kDPvZexzvkM&modestbranding=1&rel=0', 'Video 4', 4),
  ('https://www.youtube.com/embed/6UWPH_TRGQc?autoplay=1&mute=1&controls=0&loop=1&playlist=6UWPH_TRGQc&modestbranding=1&rel=0', 'Video 5', 5),
  ('https://www.youtube.com/embed/eVx-VjNfb2A?autoplay=1&mute=1&controls=0&loop=1&playlist=eVx-VjNfb2A&modestbranding=1&rel=0', 'Video 6', 6);