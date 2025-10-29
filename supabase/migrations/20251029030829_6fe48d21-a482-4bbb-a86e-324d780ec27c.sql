-- Add match_date and team logo fields to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS match_date DATE,
ADD COLUMN IF NOT EXISTS home_team_logo TEXT,
ADD COLUMN IF NOT EXISTS away_team_logo TEXT;