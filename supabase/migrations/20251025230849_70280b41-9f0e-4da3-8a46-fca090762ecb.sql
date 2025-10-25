-- Create storage bucket for blog/article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow staff to upload blog images
CREATE POLICY "Staff can upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images' AND
  (SELECT has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow staff to update blog images
CREATE POLICY "Staff can update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images' AND
  (SELECT has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow staff to delete blog images  
CREATE POLICY "Staff can delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images' AND
  (SELECT has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Public access to view blog images
CREATE POLICY "Anyone can view blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');