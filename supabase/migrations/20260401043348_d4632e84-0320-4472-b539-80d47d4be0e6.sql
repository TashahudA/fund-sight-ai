-- FIX 1: Prevent non-admins from escalating is_admin on their own profile
-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with a WITH CHECK that blocks non-admins from setting is_admin = true
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- If the user is already an admin, allow any change
    public.is_admin(auth.uid())
    -- Otherwise, is_admin must remain false (cannot self-escalate)
    OR is_admin IS NOT TRUE
  )
);

-- FIX 2: Remove the 4 broad storage policies on audit-documents
DROP POLICY IF EXISTS "Authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;