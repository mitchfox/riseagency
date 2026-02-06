-- Create a junction table for video-player tagging (many-to-many relationship)
CREATE TABLE public.video_player_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.marketing_gallery(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, player_id)
);

-- Enable RLS
ALTER TABLE public.video_player_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage video tags
CREATE POLICY "Authenticated users can view video tags" 
  ON public.video_player_tags 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert video tags" 
  ON public.video_player_tags 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete video tags" 
  ON public.video_player_tags 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_video_player_tags_video_id ON public.video_player_tags(video_id);
CREATE INDEX idx_video_player_tags_player_id ON public.video_player_tags(player_id);