import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, Download, CheckCircle2, AlertTriangle, XCircle, Info, StickyNote, Loader2, ArrowLeft, Play, Plus, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RFITab } from "@/components/RFITab";
import { DocumentsTab } from "@/components/DocumentsTab";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { generateAuditPdf } from "@/lib/generateAuditPdf";
import { generateTextPdf } from "@/lib/generateTextPdf";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    pending: "new", "in progress": "in-progress", in_progress: "in-progress", complete: "pass", "on hold": "secondary", "rfi sent": "flag",
  };
  return map[(s || "").toLowerCase()] || "secondary";
};

const statusLabel = (s: string | null) => {
  if (!s) return "Pending";
  const lower = s.toLowerCase();
  if (lower === "in_progress" || lower === "in progress") return "In Progress";
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
  const [savingNote, setSavingNote] = useState(false);
  const [auditNotes, setAuditNotes] = useState<{ id: string; note_text: string; created_at: string; full_name: string | null; email: string | null }[]>([]);
  const [runningAudit, setRunningAudit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [completionShown, setCompletionShown] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);
  const completionToastShownRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState("findings");
  const [rfiCount, setRfiCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("audit_notes")
      .select("id, note_text, created_at, user_id")
      .eq("audit_id", id)
      .order("created_at", { ascending: false });
    if (!data) { setAuditNotes([]); return; }
    const userIds = [...new Set(data.map(n => n.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
    setAuditNotes(data.map(n => ({
      id: n.id,
      note_text: n.note_text,
      created_at: n.created_at || "",
      full_name: profileMap.get(n.user_id) || null,
      email: user?.email || null,
    })));
  }, [id, user]);

  const handleAddNote = async () => {
    if (!id || !user || !noteText.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("audit_notes").insert({
      audit_id: id,
      user_id: user.id,
      note_text: noteText.trim(),
    });
    if (error) {
      toast({ title: "Failed to save note", description: error.message, variant: "destructive" });
    } else {
      setNoteText("");
      await fetchNotes();
    }
    setSavingNote(false);
  };

  useEffect(() => { fetchAudit(); fetchCounts(); fetchNotes(); }, [fetchAudit, fetchCounts, fetchNotes]);

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

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleAuditComplete = useCallback(async (auditId: string) => {
    // Re-fetch audit data so findings are in state
    await fetchAudit();

    // Auto-resolve RFIs based on new findings
    const { data: freshAudit } = await supabase.from("audits").select("ai_findings, opinion, status").eq("id", auditId).single();
    if (freshAudit) {
      const { findings } = parseFindings(freshAudit.ai_findings);
      await autoResolveRfis(findings);
    }
    await fetchCounts();
    // Re-fetch to pick up any RFI auto-resolve changes
    await fetchAudit();

    // Show opinion toast — do NOT override the status from the DB.
    // The edge function already set the correct status (complete or in_progress).
    if (completionToastShownRef.current !== auditId) {
      completionToastShownRef.current = auditId;
      const opinion = freshAudit?.opinion || "Pending";
      const dbStatus = freshAudit?.status || "in_progress";
      if (dbStatus === "complete") {
        toast({ title: "Audit marked as complete — all items resolved" });
      } else {
        toast({ title: "AI analysis complete", description: `Opinion: ${opinion}` });
      }
    }
  }, [fetchAudit, fetchCounts, autoResolveRfis, parseFindings]);

  const startPolling = useCallback((auditId: string) => {
    pollingStartRef.current = Date.now();
    setIsProcessing(true);
    setProcessingError(null);
    setShowCompleteBanner(false);

    const poll = async () => {
      const elapsed = Date.now() - pollingStartRef.current;
      if (elapsed > 10 * 60 * 1000) {
        stopPolling();
        setProcessingError("Audit is taking longer than expected — please refresh the page");
        setIsProcessing(false);
        setRunningAudit(false);
        return;
      }

      const { data } = await supabase
        .from("audits")
        .select("status, processing_progress, ai_findings, opinion")
        .eq("id", auditId)
        .single();

      if (!data) return;

      setProcessingProgress(data.processing_progress);

      if (data.status === "failed") {
        stopPolling();
        setIsProcessing(false);
        setRunningAudit(false);
        setProcessingError("Audit failed — " + (data.processing_progress || "Unknown error"));
        return;
      }

      // The audit is done when status is anything other than "processing"
      if (data.status !== "processing") {
        stopPolling();
        setShowCompleteBanner(true);
        setTimeout(async () => {
          setIsProcessing(false);
          setRunningAudit(false);
          setShowCompleteBanner(false);
          await handleAuditComplete(auditId);
        }, 1500);
      }
    };

    pollingRef.current = setInterval(poll, 3000);
    // Also poll immediately
    poll();
  }, [stopPolling, handleAuditComplete]);

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // Resume polling if user navigates back while processing, or clear stale processing state on mount
  useEffect(() => {
    if (!audit) return;
    if (audit.status === "processing") {
      if (!isProcessing && !runningAudit) {
        setRunningAudit(true);
        completionToastShownRef.current = null;
        startPolling(audit.id);
      }
    } else {
      // Status is not "processing" — ensure we're not showing the progress indicator
      if (isProcessing || runningAudit) {
        stopPolling();
        setIsProcessing(false);
        setRunningAudit(false);
        setProcessingProgress(null);
        setShowCompleteBanner(false);
      }
    }
  }, [audit?.id, audit?.status]);

  const handleRunAudit = async () => {
    if (!audit) return;
    setRunningAudit(true);
    setActiveTab("findings");
    setProcessingError(null);
    completionToastShownRef.current = null;
    try {
      await supabase.from("audits").update({ audit_started_at: new Date().toISOString() }).eq("id", audit.id);

      const { error } = await supabase.functions.invoke("dynamic-processor", {
        body: { audit_id: audit.id },
      });
      if (error) throw error;

      // Edge function returns immediately; start polling
      startPolling(audit.id);
    } catch (err: any) {
      console.error("AI Audit error:", err);
      setIsProcessing(false);
      setRunningAudit(false);
      toast({ title: "AI audit failed — please try again", description: err.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const handleDownloadFindings = async () => {
    if (!audit) return;
    if (!audit.ai_findings) {
      toast({ title: "No audit findings to download — run the AI audit first", variant: "destructive" });
      return;
    }
    setDownloading("findings");
    try {
      const [rfiRes, docRes] = await Promise.all([
        supabase.from("rfis").select("title, category, priority, status, description").eq("audit_id", audit.id),
        supabase.from("documents").select("file_name, created_at").eq("audit_id", audit.id).order("created_at", { ascending: true }),
      ]);
      generateAuditPdf({
        fundName: audit.fund_name,
        fundAbn: audit.fund_abn,
        financialYear: audit.financial_year,
        fundType: audit.fund_type,
        opinion: audit.opinion,
        aiFindingsRaw: audit.ai_findings,
        rfis: rfiRes.data || [],
        documents: docRes.data || [],
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadFromEdge = async (mode: "generate_audit_report" | "generate_management_letter") => {
    if (!audit) return;
    if (!audit.ai_findings) {
      toast({ title: "No audit findings to download — run the AI audit first", variant: "destructive" });
      return;
    }
    const docType = mode === "generate_audit_report" ? "Audit_Report" : "Management_Letter";
    setDownloading(docType);
    try {
      const { data, error } = await supabase.functions.invoke("dynamic-processor", {
        body: { audit_id: audit.id, mode },
      });
      if (error) throw error;
      if (!data?.content) {
        toast({ title: "No content returned from the server", variant: "destructive" });
        return;
      }
      generateTextPdf(data.content, audit.fund_name, audit.financial_year, docType as "Audit_Report" | "Management_Letter");
    } catch (err: any) {
      console.error("Download error:", err);
      toast({ title: "Failed to generate PDF", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (!audit) return;
    if (newStatus === "complete") {
      setPendingStatus(audit.status || "pending");
      setCompleteConfirmOpen(true);
      return;
    }
    await supabase.from("audits").update({ status: newStatus }).eq("id", audit.id);
    await fetchAudit();
    toast({ title: `Status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}` });
  };

  const handleConfirmComplete = async () => {
    if (!audit) return;
    // Resolve all open RFIs
    await supabase
      .from("rfis")
      .update({ status: "resolved" })
      .eq("audit_id", audit.id)
      .eq("status", "open");
    // Update audit status
    await supabase.from("audits").update({ status: "complete" }).eq("id", audit.id);
    await Promise.all([fetchAudit(), fetchCounts()]);
    setCompleteConfirmOpen(false);
    setPendingStatus(null);
    toast({ title: "Audit marked complete", description: "All open RFIs have been resolved." });
  };

  const handleCancelComplete = () => {
    setCompleteConfirmOpen(false);
    setPendingStatus(null);
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
    <>
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/audits" className="hover:text-foreground transition-colors duration-100">My Audits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{audit.fund_name}</span>
      </div>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-background p-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left: fund info + metadata */}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{audit.fund_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {audit.financial_year ? `Financial Year ${audit.financial_year}` : "No financial year set"}
              {audit.fund_type && <span className="ml-3 capitalize">· {audit.fund_type}</span>}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm flex-nowrap whitespace-nowrap">
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

          {/* Right: two rows */}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!!downloading || !audit.ai_findings}>
                    {downloading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Generating…</>
                    ) : (
                      <><Download className="h-4 w-4 mr-1.5" />Download<ChevronDown className="h-3 w-3 ml-1" /></>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownloadFromEdge("generate_audit_report")} disabled={!!downloading}>
                    Download Audit Report PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadFromEdge("generate_management_letter")} disabled={!!downloading}>
                    Download Management Letter PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadFindings} disabled={!!downloading}>
                    Download Findings Summary PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status dropdown */}
              <Select
                value={(audit.status || "pending").toLowerCase()}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger
                  className="h-8 w-[140px] text-[13px] font-medium"
                  style={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid #e5e5e5",
                    borderRadius: "6px",
                    color: (audit.status || "").toLowerCase() === "complete"
                      ? "hsl(142, 72%, 36%)"
                      : (audit.status || "").toLowerCase() === "in progress"
                        ? "hsl(38, 92%, 50%)"
                        : "hsl(var(--foreground))",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
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
          {/* Processing progress card */}
          {isProcessing && (
            <div className="rounded-lg border border-border bg-background p-6 space-y-3">
              {showCompleteBanner ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-status-pass" />
                  <span className="text-sm font-medium text-status-pass">Analysis complete</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                    <span className="text-sm font-medium">AI audit in progress…</span>
                  </div>
                  {processingProgress && (
                    <p className="text-sm text-muted-foreground pl-8">{processingProgress}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Error state */}
          {processingError && !isProcessing && (
            <div className="rounded-lg border border-status-fail/30 bg-status-fail/5 p-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-status-fail" />
                <span className="text-sm font-medium text-status-fail">{processingError}</span>
              </div>
            </div>
          )}

          {/* Empty state — only when NOT processing and no findings */}
          {!isProcessing && !processingError && !runningAudit && aiFindings.length === 0 ? (
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
                <Play className="h-4 w-4 mr-1.5" />Run AI Audit
              </Button>
            </div>
          ) : !isProcessing && !processingError && aiFindings.length > 0 ? (
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
          <RFITab auditId={audit.id} className="min-h-[600px] h-[calc(100vh-14rem)]" onCountChange={fetchCounts} onAutoComplete={async () => { await fetchAudit(); await fetchCounts(); }} />
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
                <Button size="sm" disabled={!noteText.trim() || savingNote} onClick={handleAddNote}>
                  {savingNote ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Note
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              {auditNotes.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#888888", fontFamily: "'Open Sans', sans-serif", fontWeight: 400 }}>No notes yet</p>
              ) : (
                auditNotes.map(note => (
                  <div key={note.id} className="rounded-lg border border-border p-3 space-y-1">
                    <p style={{ fontSize: "14px", color: "#111111", fontFamily: "'Open Sans', sans-serif", fontWeight: 400 }} className="leading-relaxed">{note.note_text}</p>
                    <div style={{ fontSize: "11px", color: "#888888", fontFamily: "'Open Sans', sans-serif", fontWeight: 400 }} className="flex items-center gap-2">
                      <span>{note.full_name || note.email || "Unknown"}</span>
                      <span>·</span>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark audit as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will resolve all open RFIs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelComplete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

        const { error: dbError } = await supabase.from("documents").insert({
          audit_id: auditId,
          file_name: safeName,
          file_type: file.type || file.name.split(".").pop() || "unknown",
          file_url: filePath,
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
