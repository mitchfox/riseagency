CREATE TABLE public.player_database_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key TEXT NOT NULL,
  player_name TEXT,
  source TEXT,
  source_id UUID,
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_database_notes_player_key ON public.player_database_notes(player_key);

ALTER TABLE public.player_database_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view notes"
  ON public.player_database_notes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert notes"
  ON public.player_database_notes FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update notes"
  ON public.player_database_notes FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete notes"
  ON public.player_database_notes FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_player_database_notes_updated_at
  BEFORE UPDATE ON public.player_database_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();