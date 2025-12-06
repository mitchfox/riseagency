-- Add contracts_password column to players table
-- Default password is '12345' for all players
ALTER TABLE public.players
ADD COLUMN contracts_password TEXT DEFAULT '12345';