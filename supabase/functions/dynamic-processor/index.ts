import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audit_id, mode, rfi_id, new_document_name, message } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (mode === "rfi_review") {
      return await handleRfiReview(supabase, anthropicKey, audit_id, rfi_id, new_document_name);
    }

    if (mode === "rfi_chat") {
      return await handleRfiChat(supabase, anthropicKey, audit_id, rfi_id, message);
    }

    // Default mode: full audit
    return await handleFullAudit(supabase, anthropicKey, audit_id);
  } catch (err: any) {
    console.error("dynamic-processor error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callClaude(anthropicKey: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || "";
}

async function handleFullAudit(supabase: any, anthropicKey: string, auditId: string) {
  // Fetch audit
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();
  if (auditError) throw auditError;

  // Fetch documents
  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .eq("audit_id", auditId);

  const docList = (docs || []).map((d: any) => d.file_name).join(", ");

  const systemPrompt = `You are an SMSF audit compliance AI. Analyse the provided fund information and documents to produce compliance findings. Return valid JSON only (no markdown fences).`;

  const userPrompt = `Audit details:
Fund Name: ${audit.fund_name}
Fund Type: ${audit.fund_type || "Unknown"}
Financial Year: ${audit.financial_year || "Unknown"}
ABN: ${audit.fund_abn || "Unknown"}
Documents uploaded: ${docList || "None"}

Produce a JSON object with this structure:
{
  "compliance_findings": [
    { "area": "string", "status": "Pass|Fail|Flag", "detail": "string", "reference": "string" }
  ],
  "opinion": "Unqualified|Qualified|Adverse",
  "opinion_reasoning": "string",
  "summary": "string"
}`;

  const responseText = await callClaude(anthropicKey, systemPrompt, userPrompt);

  let parsed;
  try {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(match ? match[1] : responseText);
  } catch {
    parsed = { compliance_findings: [], opinion: "Qualified", summary: responseText };
  }

  // Delete all existing open RFIs for this audit before creating new ones
  await supabase
    .from("rfis")
    .delete()
    .eq("audit_id", auditId)
    .eq("status", "open");

  await supabase
    .from("audits")
    .update({
      ai_findings: parsed,
      opinion: parsed.opinion || "Qualified",
      status: "in progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", auditId);

  // Create new RFIs for flagged/failed findings
  const findings = parsed.compliance_findings || [];
  for (const f of findings) {
    const status = (f.status || "").toLowerCase();
    if (status === "flag" || status === "fail" || status === "needs_info") {
      await supabase.from("rfis").insert({
        audit_id: auditId,
        title: `${f.area}: ${f.detail?.substring(0, 100) || "Needs attention"}`,
        category: f.area || "Other",
        priority: status === "fail" ? "high" : "medium",
        status: "open",
        description: `${f.detail || ""}\n\nReference: ${f.reference || "N/A"}`,
      });
    }
  }

  return new Response(JSON.stringify({ success: true, findings: parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleRfiReview(
  supabase: any,
  anthropicKey: string,
  auditId: string,
  rfiId: string,
  newDocumentName: string
) {
  // Fetch audit
  const { data: audit } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();

  // Fetch all open RFIs for this audit
  const { data: openRfis } = await supabase
    .from("rfis")
    .select("*")
    .eq("audit_id", auditId)
    .eq("status", "open");

  // Fetch the triggering RFI
  const triggeringRfi = (openRfis || []).find((r: any) => r.id === rfiId);
  const rfiTitle = triggeringRfi?.title || "Unknown RFI";

  const rfiList = (openRfis || [])
    .map((r: any) => `- ID: ${r.id} | Title: ${r.title} | Category: ${r.category || "N/A"} | Description: ${r.description || "N/A"}`)
    .join("\n");

  const systemPrompt = `You are an SMSF audit compliance AI reviewing documents submitted in response to RFIs. Return valid JSON only (no markdown fences).`;

  const userPrompt = `A new document "${newDocumentName}" has been uploaded in response to RFI: "${rfiTitle}".

Fund: ${audit?.fund_name || "Unknown"}
Financial Year: ${audit?.financial_year || "Unknown"}

Review this document and all open RFIs for this audit. For each open RFI, determine if this document resolves it.

Open RFIs:
${rfiList || "None"}

Return JSON:
{
  "rfi_review_message": "message to show in the RFI thread explaining your review",
  "resolved_rfi_ids": ["id1", "id2"],
  "audit_opinion_update": "unqualified|qualified|adverse|no_change"
}`;

  const responseText = await callClaude(anthropicKey, systemPrompt, userPrompt);

  let parsed;
  try {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(match ? match[1] : responseText);
  } catch {
    parsed = {
      rfi_review_message: "I was unable to parse the review. Please check manually.",
      resolved_rfi_ids: [],
      audit_opinion_update: "no_change",
    };
  }

  // Resolve matching RFIs
  const resolvedIds: string[] = parsed.resolved_rfi_ids || [];
  for (const id of resolvedIds) {
    await supabase
      .from("rfis")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  // Post AI's message into the RFI thread
  await supabase.from("rfi_messages").insert({
    rfi_id: rfiId,
    message: parsed.rfi_review_message,
    sender: "ai",
  });

  // Update audit opinion if needed
  if (parsed.audit_opinion_update && parsed.audit_opinion_update !== "no_change") {
    const opinionMap: Record<string, string> = {
      unqualified: "Unqualified",
      qualified: "Qualified",
      adverse: "Adverse",
    };
    const newOpinion = opinionMap[parsed.audit_opinion_update] || null;
    if (newOpinion) {
      await supabase
        .from("audits")
        .update({ opinion: newOpinion, updated_at: new Date().toISOString() })
        .eq("id", auditId);
    }
  }

  return new Response(JSON.stringify({ success: true, result: parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
