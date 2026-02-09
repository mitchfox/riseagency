
-- Create a new junction table for tagging players on analyses
CREATE TABLE public.analysis_player_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(analysis_id, player_id)
);

-- Enable RLS
ALTER TABLE public.analysis_player_tags ENABLE ROW LEVEL SECURITY;

-- Staff can manage tags (authenticated users)
CREATE POLICY "Authenticated users can view analysis_player_tags"
  ON public.analysis_player_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert analysis_player_tags"
  ON public.analysis_player_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete analysis_player_tags"
  ON public.analysis_player_tags FOR DELETE
  USING (auth.uid() IS NOT NULL);
