-- Add player_id column to scouting_reports to link to players table
ALTER TABLE public.scouting_reports
ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scouting_reports_linked_player_id 
ON public.scouting_reports(linked_player_id);

-- Add comment
COMMENT ON COLUMN public.scouting_reports.linked_player_id IS 'Links scouting report to an existing player in the database';