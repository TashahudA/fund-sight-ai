-- Allow service_role to insert invite links (Railway backend uses service_role key)
CREATE POLICY "Service role can insert invite links"
ON public.invite_links
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow service_role to update invite links (for marking as used)
CREATE POLICY "Service role can update invite links"
ON public.invite_links
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);