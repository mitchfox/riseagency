-- Add next_program_notes column to players table for brainstorming next program ideas
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS next_program_notes text;