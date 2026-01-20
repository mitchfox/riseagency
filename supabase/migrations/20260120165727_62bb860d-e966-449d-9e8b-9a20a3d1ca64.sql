-- Drop old constraint and add new one with additional categories for paragraph-specific examples
ALTER TABLE public.analysis_point_examples 
DROP CONSTRAINT analysis_point_examples_category_check;

ALTER TABLE public.analysis_point_examples 
ADD CONSTRAINT analysis_point_examples_category_check 
CHECK (category = ANY (ARRAY[
  'pre-match'::text, 
  'post-match'::text, 
  'concept'::text, 
  'other'::text, 
  'scheme'::text,
  'pre-match-p1'::text,
  'pre-match-p2'::text,
  'post-match-p1'::text,
  'post-match-p2'::text,
  'scheme-p1'::text,
  'scheme-p2'::text
]));