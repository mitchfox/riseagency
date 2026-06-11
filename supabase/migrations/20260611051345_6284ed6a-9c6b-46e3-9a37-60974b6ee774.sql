
CREATE POLICY "Anyone can upload to uploads prefix in analysis-videos"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'analysis-videos'
  AND (storage.foldername(name))[1] = 'uploads'
);

CREATE POLICY "Anyone can delete from uploads prefix in analysis-videos"
ON storage.objects FOR DELETE TO public
USING (
  bucket_id = 'analysis-videos'
  AND (storage.foldername(name))[1] = 'uploads'
);
