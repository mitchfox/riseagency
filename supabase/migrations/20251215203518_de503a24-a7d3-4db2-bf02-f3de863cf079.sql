-- Create flashcard progress table for spaced repetition
CREATE TABLE public.flashcard_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  card_key TEXT NOT NULL,
  card_type TEXT NOT NULL,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_reviewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, card_key)
);

-- Enable RLS
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Players can view and manage their own progress
CREATE POLICY "Players can view own flashcard progress"
ON public.flashcard_progress
FOR SELECT
TO authenticated
USING (
  player_id IN (
    SELECT id FROM public.players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Players can insert own flashcard progress"
ON public.flashcard_progress
FOR INSERT
TO authenticated
WITH CHECK (
  player_id IN (
    SELECT id FROM public.players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Players can update own flashcard progress"
ON public.flashcard_progress
FOR UPDATE
TO authenticated
USING (
  player_id IN (
    SELECT id FROM public.players WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Staff can view all progress
CREATE POLICY "Staff can view all flashcard progress"
ON public.flashcard_progress
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- Create index for efficient queries
CREATE INDEX idx_flashcard_progress_player_review ON public.flashcard_progress(player_id, next_review);

-- Add trigger for updated_at
CREATE TRIGGER update_flashcard_progress_updated_at
BEFORE UPDATE ON public.flashcard_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();