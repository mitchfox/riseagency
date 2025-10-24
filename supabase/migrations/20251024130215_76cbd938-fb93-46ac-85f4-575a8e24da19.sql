-- Make the highlights folder in analysis-files bucket publicly readable
CREATE POLICY "Public can view highlights"
ON storage.objects
FOR SELECT
USING (bucket_id = 'analysis-files' AND (storage.foldername(name))[1] = 'highlights');

CREATE POLICY "Public can view highlight logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'analysis-files' AND (storage.foldername(name))[1] = 'highlights' AND (storage.foldername(name))[2] = 'logos');