import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Download, CheckCircle2, AlertTriangle, XCircle, Info, StickyNote, Loader2, ArrowLeft, Play, Plus, Upload } from "lucide-react";
import { AiProcessingAnimation } from "@/components/AiProcessingAnimation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditNotes } from "@/lib/mockData";
import { RFITab } from "@/components/RFITab";
import { DocumentsTab } from "@/components/DocumentsTab";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
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

const findingLeftBorder = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return "border-l-[3px] border-l-status-pass";
  if (n === "fail") return "border-l-[3px] border-l-status-fail";
  return "border-l-[3px] border-l-status-flag";
};

const opinionLeftBorder = (opinion: string | null) => {
  const o = (opinion || "").toLowerCase();
  if (o === "unqualified") return "border-l-[3px] border-l-status-pass";
  if (o === "qualified") return "border-l-[3px] border-l-status-flag";
  if (o === "adverse") return "border-l-[3px] border-l-status-fail";
  return "";
};

const opinionTextColor = (opinion: string | null) => {
  const o = (opinion || "").toLowerCase();
  if (o === "unqualified") return "text-status-pass";
  if (o === "qualified") return "text-status-flag";
  if (o === "adverse") return "text-status-fail";
  return "text-foreground";
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
  const location = useLocation();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [runningAudit, setRunningAudit] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
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
    if (audit.ai_findings) return;
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
      if (typeof obj === "string") {
        const match = obj.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) obj = JSON.parse(match[1]);
        else obj = JSON.parse(obj);
      }
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const envelope = obj as AiFindingsEnvelope;
        const findings = Array.isArray(envelope.compliance_findings) ? envelope.compliance_findings : [];
        return { findings: findings as AiFinding[], envelope };
      }
      if (Array.isArray(obj)) return { findings: obj as AiFinding[], envelope: {} };
      return { findings: [], envelope: {} };
    } catch { return { findings: [], envelope: {} }; }
  };

  const { findings: aiFindings, envelope } = parseFindings(audit?.ai_findings);

  const passCount = aiFindings.filter(f => normalizeStatus(f.status) === "pass").length;
  const flagCount = aiFindings.filter(f => normalizeStatus(f.status) !== "pass").length;

  const autoResolveRfis = async (newFindings: AiFinding[]) => {
    if (!id || newFindings.length === 0) return;
    const { data: openRfis } = await supabase
      .from("rfis")
      .select("id, category, title")
      .eq("audit_id", id)
      .eq("status", "open");
    if (!openRfis || openRfis.length === 0) return;

    const passAreas = new Set(
      newFindings
        .filter(f => normalizeStatus(f.status) === "pass")
        .map(f => f.area.toLowerCase())
    );

    const toResolve = openRfis.filter(rfi => {
      const cat = (rfi.category || "").toLowerCase();
      const title = (rfi.title || "").toLowerCase();
      return [...passAreas].some(area => cat.includes(area) || title.includes(area) || area.includes(cat) || area.includes(title));
    });

    for (const rfi of toResolve) {
      await supabase.from("rfis").update({ status: "resolved" }).eq("id", rfi.id);
      await supabase.from("rfi_messages").insert({
        rfi_id: rfi.id,
        message: "This RFI has been automatically resolved — the re-audit found the related compliance area now passes.",
        sender: "claude",
      });
    }

    if (toResolve.length > 0) {
      toast({ title: `${toResolve.length} RFI(s) auto-resolved`, description: "New findings show these areas now pass." });
    }
  };

  const handleRunAudit = async () => {
    if (!audit) return;
    setRunningAudit(true);
    setShowProcessing(true);
    setActiveTab("findings");
    try {
      const { data, error } = await supabase.functions.invoke("dynamic-processor", {
        body: { audit_id: audit.id },
      });
      if (error) throw error;
      await fetchAudit();
      const { data: freshAudit } = await supabase.from("audits").select("ai_findings").eq("id", audit.id).single();
      if (freshAudit) {
        const { findings } = parseFindings(freshAudit.ai_findings);
        await autoResolveRfis(findings);
      }
      await fetchCounts();
      setActiveTab("findings");
      toast({ title: "AI Audit Complete", description: "Findings have been generated successfully." });
    } catch (err: any) {
      console.error("AI Audit error:", err);
      setShowProcessing(false);
      toast({ title: "Error running audit", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setRunningAudit(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!audit) return;
    if (newStatus === "complete") {
      // Check open RFIs
      const { count } = await supabase
        .from("rfis")
        .select("id", { count: "exact", head: true })
        .eq("audit_id", audit.id)
        .eq("status", "open");
      if (count && count > 0) {
        toast({ title: "Cannot complete", description: "Resolve all RFIs first", variant: "destructive" });
        return;
      }
    }
    await supabase.from("audits").update({ status: newStatus }).eq("id", audit.id);
    await fetchAudit();
    toast({ title: `Status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}` });
  };

  const allResolved = rfiCount === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="container max-w-6xl py-16 text-center animate-fade-in">
        <h2 className="text-base font-semibold">Audit not found</h2>
        <p className="text-sm text-muted-foreground mt-2">This audit doesn't exist or you don't have access.</p>
        <Button size="sm" className="mt-6" onClick={() => navigate("/audits")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/audits" className="hover:text-foreground transition-colors duration-100">My Audits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{audit.fund_name}</span>
      </div>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-background p-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left: fund info + metadata */}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{audit.fund_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {audit.financial_year ? `Financial Year ${audit.financial_year}` : "No financial year set"}
              {audit.fund_type && <span className="ml-3 capitalize">· {audit.fund_type}</span>}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <Badge variant={!allResolved && (audit.status || "").toLowerCase() === "complete" ? statusVariant("in progress") : statusVariant(audit.status)}>
                {!allResolved && (audit.status || "").toLowerCase() === "complete" ? "In Progress" : statusLabel(audit.status)}
              </Badge>
              {!allResolved && rfiCount > 0 && (
                <Badge variant="flag" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />{rfiCount} open RFI{rfiCount !== 1 ? "s" : ""}
                </Badge>
              )}
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

          {/* Right: buttons stacked */}
          <div className="flex flex-col items-stretch gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRunAudit}
                disabled={runningAudit}
              >
                {runningAudit ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Running Audit...</>
                ) : (
                  <><Play className="h-4 w-4 mr-1.5" />Run AI Audit</>
                )}
              </Button>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Download</Button>

              {/* Smart status / completion */}
              {isComplete ? (
                <Badge variant="pass" className="px-3 py-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                </Badge>
              ) : !allResolved ? (
                <div className="relative group/tooltip">
                  <Button size="sm" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark Complete
                  </Button>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background text-xs px-2.5 py-1.5 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                    Resolve all RFIs before completing
                  </div>
                </div>
              ) : canAutoComplete ? (
                <Button size="sm" onClick={handleMarkComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark Complete
                </Button>
              ) : needsWarning ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm">
                      <AlertTriangle className="h-4 w-4 mr-1.5" />Mark Complete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Complete with {audit?.opinion || "non-unqualified"} opinion?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The current audit opinion is "{audit?.opinion || "unknown"}". Are you sure you want to mark this audit as complete?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMarkComplete}>Complete Anyway</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              {/* Force-complete button */}
              {!isComplete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ShieldCheck className="h-4 w-4 mr-1.5" />Force Complete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Force complete this audit?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {rfiCount > 0
                          ? `There are still ${rfiCount} open RFI${rfiCount !== 1 ? "s" : ""}. `
                          : ""}
                        This will mark the audit as complete regardless of outstanding items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMarkComplete}>Force Complete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <UploadMoreDocuments auditId={audit.id} onUploaded={async () => { await fetchCounts(); await handleRunAudit(); }} runningAudit={runningAudit} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="findings">AI Findings</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            Documents
            {docCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{docCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rfis" className="gap-1.5">
            RFIs
            {rfiCount > 0 && <Badge variant="new" className="ml-1 text-[10px] px-1.5 py-0">{rfiCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notes">Audit Notes</TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          {showProcessing && (
            <AiProcessingAnimation
              active={showProcessing}
              onComplete={() => setShowProcessing(false)}
            />
          )}

          {!showProcessing && aiFindings.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-8 text-center">
              <Info className="h-8 w-8 text-border mx-auto mb-3" />
              <h3 className="text-base font-semibold">No AI Findings Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Click "Run AI Audit" to analyse the uploaded documents and generate compliance findings.
              </p>
              <Button
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
          ) : !showProcessing && aiFindings.length > 0 ? (
            <>
              {/* Opinion Banner */}
              <div className={`flex items-center gap-3 rounded-lg border border-border bg-hover p-4 ${opinionLeftBorder(envelope.opinion || audit.opinion)}`}>
                {opinionIcon(envelope.opinion || audit.opinion)}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DRAFT OPINION</p>
                  <p className={`font-semibold text-base mt-0.5 ${opinionTextColor(envelope.opinion || audit.opinion)}`}>
                    {envelope.opinion || audit.opinion || "Pending"}
                  </p>
                  {envelope.opinion_reasoning && (
                    <p className="text-sm text-muted-foreground mt-1">{envelope.opinion_reasoning}</p>
                  )}
                  {envelope.summary && (
                    <p className="text-xs text-muted-foreground mt-1">{envelope.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {passCount} areas passed, {flagCount} flagged for review.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {aiFindings.map((f, i) => (
                  <div key={`${f.area}-${i}`} className={`rounded-lg border border-border bg-background p-4 space-y-2 ${findingLeftBorder(f.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {findingIcon(f.status)}
                        <span className="font-semibold text-sm">{f.area}</span>
                      </div>
                      <Badge variant={findingBadgeVariant(f.status)}>{findingLabel(f.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.detail}</p>
                    <p className="text-xs text-muted-foreground">{f.reference}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab auditId={audit.id} />
        </TabsContent>

        {/* RFIs Tab */}
        <TabsContent value="rfis">
          <RFITab auditId={audit.id} className="min-h-[600px] h-[calc(100vh-14rem)]" onCountChange={fetchCounts} />
        </TabsContent>

        {/* Audit Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
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
                <Button size="sm" disabled={!noteText.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              {auditNotes.map(note => (
                <div key={note.id} className="rounded-lg border border-border p-3 space-y-1">
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
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `${auditId}/${safeName}`;
        const { error: storageError } = await supabase.storage
          .from("audit-documents")
          .upload(filePath, file, { upsert: true });
        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage
          .from("audit-documents")
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase.from("documents").insert({
          audit_id: auditId,
          file_name: safeName,
          file_type: file.type || file.name.split(".").pop() || "unknown",
          file_url: urlData.publicUrl,
          file_size: file.size,
        });
        if (dbError) throw dbError;
      }

      toast({ title: "Files uploaded", description: `${selectedFiles.length} file(s) — re-running audit…` });
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
    <>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" onChange={handleUpload} className="hidden" />
      <Button variant="outline" size="sm" className="w-full justify-center" disabled={busy} onClick={() => fileInputRef.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </>
  );
}
