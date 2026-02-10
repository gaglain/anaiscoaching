-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create table to track shared documents
CREATE TABLE public.shared_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage all documents"
ON public.shared_documents
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients can view their own documents"
ON public.shared_documents
FOR SELECT
USING (auth.uid() = client_id);

-- Storage policies for documents bucket
CREATE POLICY "Admin can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (SELECT is_admin()));

CREATE POLICY "Admin can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (SELECT is_admin()));

CREATE POLICY "Admin can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (SELECT is_admin()));

CREATE POLICY "Users can view their shared documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM public.shared_documents 
      WHERE file_path = name 
      AND client_id = auth.uid()
    )
  )
);