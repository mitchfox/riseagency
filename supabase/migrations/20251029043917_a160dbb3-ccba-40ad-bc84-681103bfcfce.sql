-- Add separate background colors for home and away teams
ALTER TABLE analyses 
DROP COLUMN IF EXISTS title_bg_color;

ALTER TABLE analyses 
ADD COLUMN home_team_bg_color TEXT DEFAULT '#1a1a1a',
ADD COLUMN away_team_bg_color TEXT DEFAULT '#8B0000';