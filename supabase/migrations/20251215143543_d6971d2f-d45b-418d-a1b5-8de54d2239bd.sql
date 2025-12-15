-- Add programming_notes field separate from agent_notes
ALTER TABLE public.players 
ADD COLUMN programming_notes text;