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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // --- Authenticate the caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audit_id, mode, rfi_id, new_document_name, message } = await req.json();

    // --- Verify caller owns the audit ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: auditOwner, error: ownerError } = await supabase
      .from("audits")
      .select("user_id")
      .eq("id", audit_id)
      .single();

    if (ownerError || !auditOwner || auditOwner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify rfi_id belongs to the audit_id for RFI modes
    if (mode === "rfi_review" || mode === "rfi_chat") {
      const { data: rfiCheck, error: rfiErr } = await supabase
        .from("rfis")
        .select("id")
        .eq("id", rfi_id)
        .eq("audit_id", audit_id)
        .single();
      if (rfiErr || !rfiCheck) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Truncate and strip prompt-control sequences from user data */
function sanitizeForPrompt(input: string, maxLen: number): string {
  return input
    .slice(0, maxLen)
    .replace(/###/g, "")
    .replace(/IGNORE PREVIOUS/gi, "")
    .replace(/SYSTEM:/gi, "")
    .replace(/\n{3,}/g, "\n\n");
}

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

  // Sanitize inputs before injecting into prompts
  const safeFundName = sanitizeForPrompt(audit.fund_name, 255);
  const safeFundType = sanitizeForPrompt(audit.fund_type || "Unknown", 100);
  const safeFinancialYear = sanitizeForPrompt(audit.financial_year || "Unknown", 20);
  const safeAbn = sanitizeForPrompt(audit.fund_abn || "Unknown", 20);
  const safeDocList = sanitizeForPrompt(docList || "None", 2000);

  const systemPrompt = `You are an SMSF audit compliance AI. Analyse the provided fund information and documents to produce compliance findings. Return valid JSON only (no markdown fences).`;

  const userPrompt = `Audit details:
Fund Name: ${safeFundName}
Fund Type: ${safeFundType}
Financial Year: ${safeFinancialYear}
ABN: ${safeAbn}
Documents uploaded: ${safeDocList}

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
      findings_completed_at: new Date().toISOString(),
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

  // Resolve matching RFIs — whitelist against known open RFIs for this audit
  const resolvedIds: string[] = parsed.resolved_rfi_ids || [];
  const openRfiIds = new Set((openRfis || []).map((r: any) => r.id));
  const safeResolvedIds = resolvedIds.filter(id => openRfiIds.has(id));
  for (const id of safeResolvedIds) {
    await supabase
      .from("rfis")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("audit_id", auditId);
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

async function handleRfiChat(
  supabase: any,
  anthropicKey: string,
  auditId: string,
  rfiId: string,
  userMessage: string
) {
  // Fetch audit
  const { data: audit } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();

  // Fetch the RFI
  const { data: rfi } = await supabase
    .from("rfis")
    .select("*")
    .eq("id", rfiId)
    .single();

  // Fetch message history
  const { data: messages } = await supabase
    .from("rfi_messages")
    .select("*")
    .eq("rfi_id", rfiId)
    .order("created_at", { ascending: true })
    .limit(20);

  const history = (messages || [])
    .map((m: any) => `[${m.sender}]: ${m.message}`)
    .join("\n");

  const systemPrompt = `You are an SMSF audit compliance AI assistant. You are responding to auditor questions about a specific RFI (Request for Information). Be helpful, concise, and reference relevant compliance standards. Return valid JSON only (no markdown fences).`;

  const userPrompt = `Fund: ${audit?.fund_name || "Unknown"}
Financial Year: ${audit?.financial_year || "Unknown"}

RFI: ${rfi?.title || "Unknown"}
Category: ${rfi?.category || "N/A"}
Description: ${rfi?.description || "N/A"}
Status: ${rfi?.status || "open"}

Conversation history:
${history}

The auditor's latest message: "${userMessage}"

Respond as the AI auditor. Return JSON:
{
  "response_message": "your helpful response to the auditor",
  "should_resolve": false,
  "audit_opinion_update": "no_change"
}

Set should_resolve to true only if the auditor explicitly confirms the RFI is resolved.`;

  const responseText = await callClaude(anthropicKey, systemPrompt, userPrompt);

  let parsed;
  try {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(match ? match[1] : responseText);
  } catch {
    parsed = {
      response_message: "I was unable to process that. Please try again.",
      should_resolve: false,
      audit_opinion_update: "no_change",
    };
  }

  // Post AI response
  await supabase.from("rfi_messages").insert({
    rfi_id: rfiId,
    message: parsed.response_message,
    sender: "ai",
  });

  // Resolve if indicated
  if (parsed.should_resolve && rfi?.status === "open") {
    await supabase
      .from("rfis")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", rfiId);
  }

  // Update opinion if needed
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
