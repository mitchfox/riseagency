-- Add example_type field to distinguish between point examples and overview examples
ALTER TABLE public.analysis_point_examples 
ADD COLUMN example_type TEXT NOT NULL DEFAULT 'point' CHECK (example_type IN ('point', 'overview'));

-- Update existing records to be 'point' type
UPDATE public.analysis_point_examples SET example_type = 'point';

-- Rename paragraph_1 and paragraph_2 to be more generic
-- We'll keep them for backwards compatibility but add a content field for overviews
ALTER TABLE public.analysis_point_examples
ADD COLUMN content TEXT;