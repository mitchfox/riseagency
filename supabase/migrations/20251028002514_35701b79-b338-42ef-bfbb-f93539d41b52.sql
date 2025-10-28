-- Add home_score and away_score to analyses table for post-match analysis
ALTER TABLE public.analyses
ADD COLUMN home_score integer,
ADD COLUMN away_score integer;