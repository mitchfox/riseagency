-- Create storage bucket for marketing gallery
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-gallery', 'marketing-gallery', true);

-- Create marketing_gallery table
CREATE TABLE public.marketing_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_gallery ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage marketing gallery"
ON public.marketing_gallery
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view marketing gallery"
ON public.marketing_gallery
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create storage policies
CREATE POLICY "Admin can upload to marketing gallery"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-gallery' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can update marketing gallery files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing-gallery' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can delete marketing gallery files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-gallery' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view marketing gallery files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'marketing-gallery');

-- Add trigger for updated_at
CREATE TRIGGER update_marketing_gallery_updated_at
BEFORE UPDATE ON public.marketing_gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();