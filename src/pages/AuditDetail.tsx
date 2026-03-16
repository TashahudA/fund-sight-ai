import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Download, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Info, StickyNote, Loader2, ArrowLeft, Play, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { auditNotes } from "@/lib/mockData";
import { RFITab } from "@/components/RFITab";
import { DocumentsTab } from "@/components/DocumentsTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Audit = Tables<"audits">;

interface AiFinding {
  area: string;
  status: "pass" | "fail" | "needs_info" | "Pass" | "Fail" | "Flag";
  detail: string;
  reference: string;
}

interface AiFindingsEnvelope {
  compliance_findings?: AiFinding[];
  rfis?: any[];
  opinion?: string;
  opinion_reasoning?: string;
  summary?: string;
}

const normalizeStatus = (s: string): "pass" | "fail" | "needs_info" => {
  const lower = s.toLowerCase();
  if (lower === "pass") return "pass";
  if (lower === "fail") return "fail";
  return "needs_info";
};

const findingIcon = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return <CheckCircle2 className="h-4 w-4 text-status-pass" />;
  if (n === "fail") return <XCircle className="h-4 w-4 text-status-fail" />;
  return <AlertTriangle className="h-4 w-4 text-status-flag" />;
};

const findingBadgeVariant = (s: string): "pass" | "fail" | "flag" => {
  const n = normalizeStatus(s);
  if (n === "pass") return "pass";
  if (n === "fail") return "fail";
  return "flag";
};

const findingLabel = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return "Pass";
  if (n === "fail") return "Fail";
  return "Needs Info";
};

const statusVariant = (s: string | null) => {
  const map: Record<string, "new" | "in-progress" | "pass" | "secondary" | "flag"> = {
    pending: "new", "in progress": "in-progress", complete: "pass", "on hold": "secondary", "rfi sent": "flag",
  };
  return map[(s || "").toLowerCase()] || "secondary";
};

const statusLabel = (s: string | null) => {
  if (!s) return "Pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const opinionBannerClass = (opinion: string | null) => {
  const o = (opinion || "").toLowerCase();
  if (o === "unqualified") return "bg-status-pass/10 border-status-pass/20";
  if (o === "qualified") return "bg-status-flag/10 border-status-flag/20";
  if (o === "adverse") return "bg-status-fail/10 border-status-fail/20";
  return "bg-muted/50 border-border";
};

const opinionIcon = (opinion: string | null) => {
  const o = (opinion || "").toLowerCase();
  if (o === "unqualified") return <CheckCircle2 className="h-5 w-5 text-status-pass shrink-0" />;
  if (o === "qualified") return <AlertTriangle className="h-5 w-5 text-status-flag shrink-0" />;
  if (o === "adverse") return <XCircle className="h-5 w-5 text-status-fail shrink-0" />;
  return <Info className="h-5 w-5 text-muted-foreground shrink-0" />;
};

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [runningAudit, setRunningAudit] = useState(false);
  const [activeTab, setActiveTab] = useState("findings");
  const [rfiCount, setRfiCount] = useState(0);
  const [docCount, setDocCount] = useState(0);

  const fetchAudit = useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    const { data, error } = await supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      setNotFound(true);
    } else {
      setAudit(data);
    }
    setLoading(false);
  }, [id]);

  const fetchCounts = useCallback(async () => {
    if (!id) return;
    const [rfiRes, docRes] = await Promise.all([
      supabase.from("rfis").select("id", { count: "exact", head: true }).eq("audit_id", id).eq("status", "open"),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("audit_id", id),
    ]);
    setRfiCount(rfiRes.count ?? 0);
    setDocCount(docRes.count ?? 0);
  }, [id]);

  useEffect(() => { fetchAudit(); fetchCounts(); }, [fetchAudit, fetchCounts]);

  // Auto-trigger AI audit on page load if documents exist but no findings yet
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!audit || autoTriggered || runningAudit) return;
    if (audit.ai_findings) return; // already has findings
    // Check if documents exist
    const checkAndRun = async () => {
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("audit_id", audit.id);
      if (count && count > 0) {
        setAutoTriggered(true);
        handleRunAudit();
      }
    };
    checkAndRun();
  }, [audit, autoTriggered, runningAudit]);

  const parseFindings = (raw: any): { findings: AiFinding[]; envelope: AiFindingsEnvelope } => {
    if (!raw) return { findings: [], envelope: {} };
    try {
      let obj = raw;
      // If it's a string (possibly with markdown fences), extract JSON
      if (typeof obj === "string") {
        const match = obj.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) obj = JSON.parse(match[1]);
        else obj = JSON.parse(obj);
      }
      // Envelope format: { compliance_findings: [...], opinion, summary, ... }
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const envelope = obj as AiFindingsEnvelope;
        const findings = Array.isArray(envelope.compliance_findings) ? envelope.compliance_findings : [];
        return { findings: findings as AiFinding[], envelope };
      }
      // Direct array format (legacy)
      if (Array.isArray(obj)) return { findings: obj as AiFinding[], envelope: {} };
      return { findings: [], envelope: {} };
    } catch { return { findings: [], envelope: {} }; }
  };

  const { findings: aiFindings, envelope } = parseFindings(audit?.ai_findings);

  const passCount = aiFindings.filter(f => normalizeStatus(f.status) === "pass").length;
  const flagCount = aiFindings.filter(f => normalizeStatus(f.status) !== "pass").length;

  const handleRunAudit = async () => {
    if (!audit) return;
    setRunningAudit(true);
    try {
      const { data, error } = await supabase.functions.invoke("dynamic-processor", {
        body: { audit_id: audit.id },
      });
      if (error) throw error;
      await fetchAudit();
      await fetchCounts();
      setActiveTab("findings");
      toast({ title: "AI Audit Complete", description: "Findings have been generated successfully." });
    } catch (err: any) {
      console.error("AI Audit error:", err);
      toast({ title: "Error running audit", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setRunningAudit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="container max-w-6xl py-16 text-center animate-fade-in">
        <h2 className="font-serif-display text-xl font-semibold">Audit not found</h2>
        <p className="text-sm text-muted-foreground mt-2">This audit doesn't exist or you don't have access.</p>
        <Button variant="accent" size="sm" className="mt-6" onClick={() => navigate("/audits")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/audits" className="hover:text-foreground transition-colors">My Audits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{audit.fund_name}</span>
      </div>

      {/* Header Card */}
      <div className="rounded-xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif-display text-2xl font-semibold">{audit.fund_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {audit.financial_year ? `Financial Year ${audit.financial_year}` : "No financial year set"}
              {audit.fund_type && <span className="ml-3 capitalize">· {audit.fund_type}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              className="shadow-sm"
              onClick={handleRunAudit}
              disabled={runningAudit}
            >
              {runningAudit ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Running Audit...</>
              ) : (
                <><Play className="h-4 w-4 mr-1.5" />Run AI Audit</>
              )}
            </Button>
            <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-1.5" />Download</Button>
            <Button variant="accent" size="sm" className="shadow-sm"><ShieldCheck className="h-4 w-4 mr-1.5" />Approve & Sign</Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <Badge variant={statusVariant(audit.status)}>{statusLabel(audit.status)}</Badge>
          <span className="text-muted-foreground">
            Opinion: {audit.opinion || "Pending"}
          </span>
          {audit.fund_abn && <span className="text-muted-foreground">ABN: {audit.fund_abn}</span>}
          {audit.created_at && (
            <span className="text-muted-foreground">
              Created: {new Date(audit.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="findings">AI Findings</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            Documents
            {docCount > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{docCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rfis" className="gap-1.5">
            RFIs
            {rfiCount > 0 && <Badge variant="new" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{rfiCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notes">Audit Notes</TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          {aiFindings.length === 0 ? (
            <div className="rounded-xl bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-serif-display font-semibold text-lg">No AI Findings Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Click "Run AI Audit" to analyse the uploaded documents and generate compliance findings.
              </p>
              <Button
                variant="accent"
                size="sm"
                className="mt-4"
                onClick={handleRunAudit}
                disabled={runningAudit}
              >
                {runningAudit ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Running Audit...</>
                ) : (
                  <><Play className="h-4 w-4 mr-1.5" />Run AI Audit</>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Opinion Banner */}
              <div className={`flex items-center gap-3 rounded-xl border p-4 ${opinionBannerClass(envelope.opinion || audit.opinion)}`}>
                {opinionIcon(envelope.opinion || audit.opinion)}
                <div>
                  <p className="font-medium text-sm">Draft Opinion: {envelope.opinion || audit.opinion || "Pending"}</p>
                  {envelope.opinion_reasoning && (
                    <p className="text-sm text-muted-foreground mt-1">{envelope.opinion_reasoning}</p>
                  )}
                  {envelope.summary && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{envelope.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {passCount} areas passed, {flagCount} flagged for review.
                  </p>
                </div>
              </div>

              {/* Upload More Documents — above findings */}
              <UploadMoreDocuments auditId={audit.id} onUploaded={async () => { await fetchCounts(); await handleRunAudit(); }} runningAudit={runningAudit} />

              <div className="grid gap-4 md:grid-cols-2">
                {aiFindings.map((f, i) => (
                  <div key={`${f.area}-${i}`} className="rounded-xl bg-card p-4 space-y-2 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {findingIcon(f.status)}
                        <span className="font-medium text-sm">{f.area}</span>
                      </div>
                      <Badge variant={findingBadgeVariant(f.status)}>{findingLabel(f.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.detail}</p>
                    <p className="text-xs text-muted-foreground italic">{f.reference}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab auditId={audit.id} />
        </TabsContent>

        {/* RFIs Tab */}
        <TabsContent value="rfis">
          <RFITab auditId={audit.id} className="h-[calc(100vh-22rem)]" />
        </TabsContent>

        {/* Audit Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="rounded-xl bg-card p-5 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display font-semibold flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                Internal Notes
              </h3>
              <span className="text-xs text-muted-foreground">Not shared with accountant</span>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Add an internal note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <Button variant="accent" size="sm" disabled={!noteText.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              {auditNotes.map(note => (
                <div key={note.id} className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm leading-relaxed">{note.text}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium">{note.author}</span>
                    <span>·</span>
                    <span>{note.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UploadMoreDocuments({ auditId, onUploaded, runningAudit }: { auditId: string; onUploaded: () => Promise<void>; runningAudit: boolean }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `${auditId}/${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("audit-documents")
        .upload(filePath, file, { upsert: true });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("audit-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("documents").insert({
        audit_id: auditId,
        file_name: file.name,
        file_type: file.type || file.name.split(".").pop() || "unknown",
        file_url: urlData.publicUrl,
      });
      if (dbError) throw dbError;

      toast({ title: "File uploaded", description: `${file.name} — re-running audit…` });
      setUploading(false);
      await onUploaded();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const busy = uploading || runningAudit;

  return (
    <div className="rounded-xl bg-card p-5 flex items-center justify-between" style={{ boxShadow: "var(--shadow-card)" }}>
      <div>
        <p className="text-sm font-medium">Upload additional documents</p>
        <p className="text-xs text-muted-foreground">
          {runningAudit ? "Re-running audit with new documents…" : "New files will automatically re-run the audit."}
        </p>
      </div>
      <div>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" onChange={handleUpload} className="hidden" />
        <Button variant="accent" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
          {uploading ? "Uploading…" : runningAudit ? "Re-running Audit…" : "Upload More Documents"}
        </Button>
      </div>
    </div>
  );
}
