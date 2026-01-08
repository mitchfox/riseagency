-- Create press_releases table for storing official press releases
CREATE TABLE public.press_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.press_releases ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (press releases are public)
CREATE POLICY "Press releases are viewable by everyone" 
ON public.press_releases 
FOR SELECT 
USING (is_published = true);

-- Create policy for authenticated users to manage (staff)
CREATE POLICY "Authenticated users can manage press releases" 
ON public.press_releases 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_press_releases_updated_at
BEFORE UPDATE ON public.press_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample press releases
INSERT INTO public.press_releases (title, content, excerpt, published_at) VALUES 
(
  'RISE Football Agency Expands European Scouting Network',
  'RISE Football Agency is pleased to announce a significant expansion of our European scouting network. With new partnerships across Scandinavia, Eastern Europe, and the Balkans, we continue to strengthen our ability to identify and develop exceptional football talent.

Our scouting team now covers over 25 leagues across Europe, ensuring comprehensive coverage of emerging talent at all levels of the professional game. This expansion reflects our commitment to providing our players with unparalleled visibility and opportunities.

"We believe the best talent can come from anywhere," said the RISE Football Agency team. "By expanding our network, we ensure no exceptional player goes unnoticed."',
  'RISE Football Agency announces significant expansion of European scouting network with new partnerships across Scandinavia, Eastern Europe, and the Balkans.',
  NOW() - INTERVAL '7 days'
),
(
  'New Performance Analysis Partnership Announced',
  'RISE Football Agency has partnered with leading sports technology providers to enhance our performance analysis capabilities. This partnership brings cutting-edge video analysis, GPS tracking integration, and advanced metrics to all represented players.

The new tools will enable our coaching and development team to provide even more detailed insights into player performance, helping athletes optimize their game and track their progress with precision.

Players will now receive comprehensive match reports featuring heat maps, passing networks, and comparative statistics against league averages.',
  'RISE Football Agency partners with leading sports technology providers to enhance performance analysis capabilities for all represented players.',
  NOW() - INTERVAL '30 days'
),
(
  'RISE Football Agency Year in Review: Record Transfer Activity',
  'As we reflect on the past year, RISE Football Agency is proud to report record levels of transfer activity and player development success. Our represented players have secured moves to top-tier clubs across Europe''s major leagues.

Key highlights include multiple players earning national team call-ups, significant contract renewals, and successful loan moves that have accelerated player development.

We remain committed to our core mission: developing players holistically and creating career opportunities that align with their long-term goals.',
  'RISE Football Agency reports record transfer activity and player development success over the past year.',
  NOW() - INTERVAL '60 days'
);