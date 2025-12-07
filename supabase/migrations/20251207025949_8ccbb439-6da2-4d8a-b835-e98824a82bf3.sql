-- Add transfer_status and agent_notes columns to players table for Transfer Hub
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS transfer_status text DEFAULT 'actively_marketed',
ADD COLUMN IF NOT EXISTS transfer_priority text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS agent_notes text;