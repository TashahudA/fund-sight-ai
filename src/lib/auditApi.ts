const BASE_URL = import.meta.env.VITE_AUDIT_API_URL ?? "https://auditron-server-production.up.railway.app";

async function callAuditApi(body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export async function startAudit(auditId: string) {
  return callAuditApi({ audit_id: auditId });
}

export async function reviewRfiDocument(auditId: string, rfiId: string, documentName: string) {
  return callAuditApi({ audit_id: auditId, mode: "rfi_review", rfi_id: rfiId, new_document_name: documentName });
}

export async function sendRfiMessage(auditId: string, rfiId: string, message: string) {
  return callAuditApi({ audit_id: auditId, mode: "rfi_chat", rfi_id: rfiId, message });
}

export async function resolveRfi(auditId: string, rfiId: string, resolvedBy: "auditor" | "trustee") {
  return callAuditApi({ audit_id: auditId, mode: "resolve_rfi", rfi_id: rfiId, resolved_by: resolvedBy });
}
