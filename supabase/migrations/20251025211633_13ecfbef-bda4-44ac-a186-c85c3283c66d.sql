-- Add column to store additional striker statistics in player_analysis table
ALTER TABLE player_analysis 
ADD COLUMN striker_stats JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN player_analysis.striker_stats IS 'Additional statistics for strikers (e.g., shots, xG, key passes, etc.) stored as JSON';
