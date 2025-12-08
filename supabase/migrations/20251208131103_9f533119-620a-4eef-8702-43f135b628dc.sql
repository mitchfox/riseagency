-- Create a dedicated bucket for coaching database files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('coaching-database', 'coaching-database', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Anyone can view coaching database files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'coaching-database');

-- Allow staff and admin to upload
CREATE POLICY "Staff and admin can upload to coaching database"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'coaching-database' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);

-- Allow staff and admin to update
CREATE POLICY "Staff and admin can update coaching database files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'coaching-database' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);

-- Allow staff and admin to delete
CREATE POLICY "Staff and admin can delete coaching database files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'coaching-database' 
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);