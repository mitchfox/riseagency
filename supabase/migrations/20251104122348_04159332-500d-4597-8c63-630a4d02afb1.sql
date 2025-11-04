-- Add foreign key constraint for player_programs to players
ALTER TABLE player_programs
ADD CONSTRAINT fk_player_programs_player_id 
FOREIGN KEY (player_id) 
REFERENCES players(id) 
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_player_programs_player_id 
ON player_programs(player_id);