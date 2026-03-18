
CREATE TABLE public.audit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes on own audits"
ON public.audit_notes FOR SELECT
TO authenticated
USING (auth.uid() = (SELECT user_id FROM public.audits WHERE id = audit_notes.audit_id));

CREATE POLICY "Users can insert notes on own audits"
ON public.audit_notes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND auth.uid() = (SELECT user_id FROM public.audits WHERE id = audit_notes.audit_id)
);

CREATE POLICY "Users can delete own notes"
ON public.audit_notes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
