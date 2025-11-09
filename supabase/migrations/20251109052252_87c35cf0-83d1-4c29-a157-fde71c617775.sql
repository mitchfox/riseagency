
-- Add 'scheme' to the allowed categories for analysis_point_examples
ALTER TABLE analysis_point_examples DROP CONSTRAINT IF EXISTS analysis_point_examples_category_check;

ALTER TABLE analysis_point_examples ADD CONSTRAINT analysis_point_examples_category_check 
CHECK (category IN ('pre-match', 'post-match', 'concept', 'other', 'scheme'));
