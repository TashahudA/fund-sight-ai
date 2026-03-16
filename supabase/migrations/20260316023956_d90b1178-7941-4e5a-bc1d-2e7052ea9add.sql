
-- Create the audit-documents storage bucket (public so we can get download URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-documents', 'audit-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to audit-documents bucket
CREATE POLICY "Authenticated users can upload audit documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audit-documents');

-- Allow authenticated users to read files from audit-documents bucket
CREATE POLICY "Authenticated users can read audit documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audit-documents');

-- Allow authenticated users to delete their own audit documents
CREATE POLICY "Authenticated users can delete audit documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audit-documents');
