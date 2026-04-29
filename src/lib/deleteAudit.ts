import { supabase } from "@/integrations/supabase/client";

/**
 * Permanently delete an audit and all related data (storage + child tables).
 * Order matters because there are no FK cascades on these tables.
 * Best-effort: storage and child-row failures are logged but do not block
 * the final audits row delete (RLS already restricts to the owner).
 */
export async function deleteAuditCascade(auditId: string): Promise<void> {
  // 1) Storage: list all files under {auditId}/ and remove them
  try {
    const { data: objects } = await supabase.storage
      .from("audit-documents")
      .list(auditId, { limit: 1000 });
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${auditId}/${o.name}`);
      await supabase.storage.from("audit-documents").remove(paths);
    }
  } catch (err) {
    console.warn("[deleteAudit] storage cleanup failed", err);
  }

  // 2) Child rows. rfi_messages first (joined via rfis), then everything else.
  try {
    const { data: rfiRows } = await supabase
      .from("rfis")
      .select("id")
      .eq("audit_id", auditId);
    const rfiIds = (rfiRows || []).map((r) => r.id);
    if (rfiIds.length > 0) {
      await supabase.from("rfi_messages").delete().in("rfi_id", rfiIds);
    }
  } catch (err) {
    console.warn("[deleteAudit] rfi_messages cleanup failed", err);
  }

  await supabase.from("rfis").delete().eq("audit_id", auditId);
  await supabase.from("documents").delete().eq("audit_id", auditId);
  await supabase.from("audit_notes").delete().eq("audit_id", auditId);
  await supabase.from("finding_reviews").delete().eq("audit_id", auditId);

  // 3) Finally the audit itself
  const { error } = await supabase.from("audits").delete().eq("id", auditId);
  if (error) throw error;
}