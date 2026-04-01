-- Add admin-only UPDATE and DELETE policies to invite_links
CREATE POLICY "Admins can update invite links"
ON public.invite_links
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete invite links"
ON public.invite_links
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Add ownership-scoped UPDATE policy for audit-documents storage bucket
CREATE POLICY "Users can update own audit documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.audits WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'audit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.audits WHERE user_id = auth.uid()
  )
);