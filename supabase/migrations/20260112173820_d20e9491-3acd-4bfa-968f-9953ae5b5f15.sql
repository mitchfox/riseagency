-- Create staff_documents table for Docs and Sheets widgets
CREATE TABLE public.staff_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  doc_type TEXT NOT NULL DEFAULT 'doc', -- 'doc' or 'sheet'
  folder_id TEXT DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all documents
CREATE POLICY "Authenticated users can view all staff documents"
ON public.staff_documents
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to create documents
CREATE POLICY "Authenticated users can create staff documents"
ON public.staff_documents
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update staff documents"
ON public.staff_documents
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete staff documents"
ON public.staff_documents
FOR DELETE
USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE TRIGGER update_staff_documents_updated_at
BEFORE UPDATE ON public.staff_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();