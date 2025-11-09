-- Add score field to r90_ratings table
ALTER TABLE public.r90_ratings 
ADD COLUMN score numeric;

COMMENT ON COLUMN public.r90_ratings.score IS 'R90 score value for this rating criterion';