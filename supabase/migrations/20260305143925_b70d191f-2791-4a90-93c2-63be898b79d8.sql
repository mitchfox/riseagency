
-- Create dataset_frames table for training data management
CREATE TABLE public.dataset_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES public.performance_report_actions(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  frame_time double precision NOT NULL DEFAULT 0,
  image_url text NOT NULL,
  annotations jsonb DEFAULT '[]'::jsonb,
  exported boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dataset_frames ENABLE ROW LEVEL SECURITY;

-- Staff can manage dataset frames (authenticated users)
CREATE POLICY "Authenticated users can manage dataset_frames"
  ON public.dataset_frames
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for dataset images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dataset-images', 'dataset-images', true, 10485760, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dataset-images bucket
CREATE POLICY "Authenticated users can upload dataset images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dataset-images');

CREATE POLICY "Authenticated users can update dataset images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dataset-images');

CREATE POLICY "Anyone can view dataset images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'dataset-images');

CREATE POLICY "Authenticated users can delete dataset images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dataset-images');
