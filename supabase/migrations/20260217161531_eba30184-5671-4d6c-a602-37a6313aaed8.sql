
-- Create storage bucket for annotation project videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('annotation-videos', 'annotation-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read annotation videos (public bucket)
CREATE POLICY "Public read access for annotation videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'annotation-videos');

-- Allow authenticated users to upload annotation videos
CREATE POLICY "Authenticated users can upload annotation videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'annotation-videos' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own annotation videos
CREATE POLICY "Authenticated users can update annotation videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'annotation-videos' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete annotation videos
CREATE POLICY "Authenticated users can delete annotation videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'annotation-videos' AND auth.uid() IS NOT NULL);
