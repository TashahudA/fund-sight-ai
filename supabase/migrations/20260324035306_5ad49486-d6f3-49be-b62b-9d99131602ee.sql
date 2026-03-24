-- Make the audit-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'audit-documents';

-- Drop existing broad storage policies and recreate with ownership checks
DROP POLICY IF EXISTS "Authenticated users can upload audit documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read audit documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete audit documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own audit documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own audit documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audit documents" ON storage.objects;

-- Ownership-scoped SELECT policy
CREATE POLICY "Users can read own audit documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.audits WHERE user_id = auth.uid()
  )
);

-- Ownership-scoped INSERT policy
CREATE POLICY "Users can upload own audit documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audit-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.audits WHERE user_id = auth.uid()
  )
);

-- Ownership-scoped DELETE policy
CREATE POLICY "Users can delete own audit documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audit-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.audits WHERE user_id = auth.uid()
  )
);