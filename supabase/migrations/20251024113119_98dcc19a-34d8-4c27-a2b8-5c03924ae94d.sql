-- Add visible_on_stars_page column to players table
ALTER TABLE players ADD COLUMN visible_on_stars_page boolean DEFAULT false;

-- Add highlights column to store ordered highlights with video and logo
ALTER TABLE players ADD COLUMN highlights jsonb DEFAULT '[]'::jsonb;