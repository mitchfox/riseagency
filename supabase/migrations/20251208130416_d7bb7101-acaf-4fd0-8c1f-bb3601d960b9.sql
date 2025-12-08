-- Allow staff to upload to marketing-gallery bucket
CREATE POLICY "Staff can upload to marketing gallery"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-gallery' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);

-- Allow staff to update files in marketing-gallery bucket
CREATE POLICY "Staff can update marketing gallery files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'marketing-gallery' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);

-- Allow staff to delete files in marketing-gallery bucket  
CREATE POLICY "Staff can delete marketing gallery files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'marketing-gallery' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);