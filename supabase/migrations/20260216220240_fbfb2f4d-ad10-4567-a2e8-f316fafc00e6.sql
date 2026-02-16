-- Add focal_point column for controlling image display position in portal hub slider
ALTER TABLE public.marketing_gallery
ADD COLUMN focal_point text DEFAULT 'center' CHECK (focal_point IN ('top', 'center', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'));