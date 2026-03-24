-- Fix audits table: change policies from public to authenticated
DROP POLICY IF EXISTS "Users can delete own audits" ON audits;
DROP POLICY IF EXISTS "Users can insert own audits" ON audits;
DROP POLICY IF EXISTS "Users can update own audits" ON audits;
DROP POLICY IF EXISTS "Users can view own audits" ON audits;

CREATE POLICY "Users can delete own audits" ON audits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audits" ON audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audits" ON audits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own audits" ON audits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix documents table
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can select own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;

CREATE POLICY "Users can delete own documents" ON documents FOR DELETE TO authenticated USING (auth.uid() = (SELECT audits.user_id FROM audits WHERE audits.id = documents.audit_id));
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT audits.user_id FROM audits WHERE audits.id = documents.audit_id));
CREATE POLICY "Users can select own documents" ON documents FOR SELECT TO authenticated USING (auth.uid() = (SELECT audits.user_id FROM audits WHERE audits.id = documents.audit_id));
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE TO authenticated USING (auth.uid() = (SELECT audits.user_id FROM audits WHERE audits.id = documents.audit_id));

-- Fix rfis table
DROP POLICY IF EXISTS "Users can manage own rfis" ON rfis;
CREATE POLICY "Users can manage own rfis" ON rfis FOR ALL TO authenticated USING (auth.uid() = (SELECT audits.user_id FROM audits WHERE audits.id = rfis.audit_id));

-- Fix rfi_messages table
DROP POLICY IF EXISTS "Users can manage own rfi messages" ON rfi_messages;
CREATE POLICY "Users can manage own rfi messages" ON rfi_messages FOR ALL TO authenticated USING (auth.uid() = (SELECT a.user_id FROM audits a JOIN rfis r ON r.audit_id = a.id WHERE r.id = rfi_messages.rfi_id));