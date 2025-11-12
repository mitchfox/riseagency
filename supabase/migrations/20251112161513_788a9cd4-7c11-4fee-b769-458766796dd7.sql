-- Add visible_to_player_ids column to updates table
ALTER TABLE updates 
ADD COLUMN visible_to_player_ids uuid[];

-- Update RLS policy for players to check player-specific visibility
DROP POLICY IF EXISTS "Players can view visible updates" ON updates;

CREATE POLICY "Players can view visible updates" 
ON updates 
FOR SELECT 
USING (
  visible = true 
  AND (
    visible_to_player_ids IS NULL 
    OR array_length(visible_to_player_ids, 1) IS NULL 
    OR (
      SELECT players.id 
      FROM players 
      WHERE players.email = (auth.jwt() ->> 'email') 
      LIMIT 1
    ) = ANY(visible_to_player_ids)
  )
);