
-- Add unique constraint to prevent duplicate analyses for same player/date/opponent
CREATE UNIQUE INDEX IF NOT EXISTS unique_player_analysis 
ON player_analysis(player_id, analysis_date, opponent) 
WHERE opponent IS NOT NULL;
