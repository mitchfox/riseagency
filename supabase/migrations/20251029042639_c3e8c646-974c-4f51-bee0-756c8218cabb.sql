-- Add background color field for title styling
ALTER TABLE analyses
ADD COLUMN title_bg_color TEXT DEFAULT '#1a1a1a';