
-- Allow admins to read all audits
CREATE POLICY "Admins can view all audits"
ON public.audits
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all documents
CREATE POLICY "Admins can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all RFIs
CREATE POLICY "Admins can view all rfis"
ON public.rfis
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all RFI messages
CREATE POLICY "Admins can view all rfi messages"
ON public.rfi_messages
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all audit notes
CREATE POLICY "Admins can view all audit notes"
ON public.audit_notes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all finding reviews
CREATE POLICY "Admins can view all finding reviews"
ON public.finding_reviews
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
