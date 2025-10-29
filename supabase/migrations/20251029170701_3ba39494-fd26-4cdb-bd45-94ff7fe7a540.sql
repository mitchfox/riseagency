-- Add video_url column to analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS video_url text;

-- Create storage bucket for analysis videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-videos', 'analysis-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for analysis videos
CREATE POLICY "Anyone can view analysis videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'analysis-videos');

CREATE POLICY "Staff can upload analysis videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'analysis-videos' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can update analysis videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'analysis-videos' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can delete analysis videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'analysis-videos' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);