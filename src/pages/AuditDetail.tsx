import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, Download, CheckCircle2, AlertTriangle, XCircle, Info, StickyNote, Loader2, ArrowLeft, Play, Plus, Upload, ChevronDown, Eye, CircleDot, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RFITab } from "@/components/RFITab";
import { FindingReviewCard, type ReviewAction } from "@/components/FindingReviewCard";
import { Progress } from "@/components/ui/progress";
import { DocumentsTab } from "@/components/DocumentsTab";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { startAudit } from "@/lib/auditApi";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type Audit = Tables<"audits">;

type FindingStatus = "pass" | "pass_with_review" | "needs_info" | "fail" | "refer_to_auditor";

interface JudgmentFlag {
  reason: string;
  suggested_action: string;
  risk_if_missed: string;
}

interface AiFinding {
  area: string;
  status: string;
  detail: string;
  reference: string;
  confidence?: "high" | "medium" | "low";
  judgment_flag?: JudgmentFlag | null;
  remediated?: boolean;
}

interface AiFindingsEnvelope {
  compliance_findings?: AiFinding[];
  rfis?: any[];
  opinion?: string;
  opinion_reasoning?: string;
  summary?: string;
  auditor_review_summary?: string;
  other_matters?: string[];
  emphasis_of_matter?: string[];
}

const normalizeStatus = (s: string): FindingStatus => {
  const lower = s.toLowerCase();
  if (lower === "pass") return "pass";
  if (lower === "pass_with_review") return "pass_with_review";
  if (lower === "fail") return "fail";
  if (lower === "refer_to_auditor") return "refer_to_auditor";
  return "needs_info";
};

const findingIcon = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return <CheckCircle2 className="h-4 w-4 text-status-pass" />;
  if (n === "pass_with_review") return <Eye className="h-4 w-4 text-status-flag" />;
  if (n === "fail") return <XCircle className="h-4 w-4 text-status-fail" />;
  if (n === "refer_to_auditor") return <CircleDot className="h-4 w-4 text-status-fail" />;
  return <Info className="h-4 w-4 text-status-new" />;
};

const findingBadgeVariant = (s: string): "pass" | "fail" | "flag" | "new" | "refer" => {
  const n = normalizeStatus(s);
  if (n === "pass") return "pass";
  if (n === "pass_with_review") return "flag";
  if (n === "fail") return "fail";
  if (n === "refer_to_auditor") return "refer";
  return "new";
};

const findingLabel = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return "Pass";
  if (n === "pass_with_review") return "Auditor Review";
  if (n === "fail") return "Contravention";
  if (n === "refer_to_auditor") return "Auditor Decision Required";
  return "Info Required";
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

const findingLeftBorder = (s: string, remediated?: boolean) => {
  if (remediated) return "border-l-[3px] border-l-muted-foreground/30";
  const n = normalizeStatus(s);
  if (n === "pass") return "border-l-[3px] border-l-status-pass";
  if (n === "pass_with_review") return "border-l-[3px] border-l-status-flag";
  if (n === "fail" || n === "refer_to_auditor") return "border-l-[3px] border-l-status-fail";
  return "border-l-[3px] border-l-status-new";
};

const confidenceDot = (c?: "high" | "medium" | "low") => {
  if (!c) return null;
  const color = c === "high" ? "bg-status-pass" : c === "medium" ? "bg-status-flag" : "bg-status-fail";
  const label = c.charAt(0).toUpperCase() + c.slice(1);
  return <span title={`${label} confidence`} className={`inline-block h-2 w-2 rounded-full ${color}`} />;
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
  const [auditorNotes, setAuditorNotes] = useState("");
  const [savingAuditorNotes, setSavingAuditorNotes] = useState(false);
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
  const [unlocking, setUnlocking] = useState(false);
  const paymentPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reviews, setReviews] = useState<ReviewAction[]>([]);

  const isPaid = audit?.payment_status === "paid";

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
      setAuditorNotes(data.auditor_notes || "");
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

  const handleSaveAuditorNotes = async () => {
    if (!id) return;
    setSavingAuditorNotes(true);
    const { error } = await supabase.from("audits").update({ auditor_notes: auditorNotes }).eq("id", id);
    if (error) {
      toast({ title: "Failed to save notes", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Auditor notes saved — will be used on next audit run." });
    }
    setSavingAuditorNotes(false);
  };

  useEffect(() => { fetchAudit(); fetchCounts(); fetchNotes(); }, [fetchAudit, fetchCounts, fetchNotes]);

  // Payment return detection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success" && id) {
      toast({ title: "Payment confirmed — loading your full audit..." });
      window.history.replaceState({}, "", location.pathname);
      const pollPayment = setInterval(async () => {
        const { data } = await supabase.from("audits").select("payment_status").eq("id", id).single();
        if (data?.payment_status === "paid") {
          clearInterval(pollPayment);
          paymentPollingRef.current = null;
          await fetchAudit();
        }
      }, 2000);
      paymentPollingRef.current = pollPayment;
    } else if (params.get("payment") === "cancelled") {
      window.history.replaceState({}, "", location.pathname);
    }
    return () => { if (paymentPollingRef.current) clearInterval(paymentPollingRef.current); };
  }, [id, location.search]);

  const handleUnlockAudit = async () => {
    if (!audit) return;
    setUnlocking(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setUnlocking(false);
        return;
      }
      const audit_id = id;
      const user_id = authUser.id;
      console.log("Checkout request:", { audit_id, user_id });
      const res = await fetch("https://auditron-server-production.up.railway.app/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ audit_id, user_id }),
      });
      console.log("Checkout response status:", res.status);
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Checkout failed", description: data.error || data.message || JSON.stringify(data), variant: "destructive" });
        return;
      }
      if (data.free) {
        await fetchAudit();
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Unexpected response", description: JSON.stringify(data), variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({ title: "Failed to start checkout", description: err.message || "Network error", variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };



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
  const reviewCount = aiFindings.filter(f => {
    const n = normalizeStatus(f.status);
    return n === "pass_with_review" || n === "refer_to_auditor";
  }).length;
  const flagCount = aiFindings.filter(f => normalizeStatus(f.status) !== "pass").length;

  // autoResolveRfis removed — re-audit must never change RFI status from the frontend

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleAuditComplete = useCallback(async (auditId: string) => {
    // Re-fetch audit and counts from DB — trust whatever the DB says
    await fetchAudit();
    await fetchCounts();

    // Show toast only once per audit run
    if (completionToastShownRef.current !== auditId) {
      completionToastShownRef.current = auditId;
      const { data: freshAudit } = await supabase.from("audits").select("opinion, status").eq("id", auditId).single();
      const opinion = freshAudit?.opinion || "Pending";
      toast({ title: "AI analysis complete", description: `Opinion: ${opinion}` });
    }
  }, [fetchAudit, fetchCounts]);

  const startPolling = useCallback((auditId: string) => {
    stopPolling();
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
    if (!audit || runningAudit) return;

    setRunningAudit(true);

    try {
      // Set status to processing immediately in DB
      await supabase
        .from("audits")
        .update({ status: "processing" })
        .eq("id", audit.id);

      // Call the Railway API
      await startAudit(audit.id);

      completionToastShownRef.current = null;
      startPolling(audit.id);
      await fetchAudit();
    } catch (err) {
      console.error("Failed to start audit:", err);
      toast({
        title: "Failed to start audit",
        description: "Please try again",
        variant: "destructive",
      });
      setRunningAudit(false);
    }
  };

  const handleDownloadAuditReport = async (e?: any) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!audit?.ai_findings) {
      toast({ title: "Run the AI audit first", variant: "destructive" });
      return;
    }
    setDownloading("report");
    try {
      const { findings: f, envelope: env } = parseFindings(audit.ai_findings);
      const { data: rfiData } = await supabase.from("rfis").select("*").eq("audit_id", audit.id);
      const rfis = rfiData || [];
      const opinion = (audit.opinion || "pending").toUpperCase();
      const opStyle = audit.opinion === "unqualified" ? "color:#006400;background:#e0ffe0;" : audit.opinion === "qualified" ? "color:#808000;background:#ffffcc;" : "color:#800000;background:#ffe0e0;";

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Audit Report — ${audit.fund_name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5;}
  h1{font-size:22px;margin-bottom:2px;}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #111;padding-bottom:4px;margin-top:32px;}
  .meta{color:#666;font-size:13px;margin-bottom:24px;}
  .opinion{display:inline-block;padding:5px 14px;border-radius:4px;font-weight:bold;font-size:13px;${opStyle}}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;}
  th{background:#111;color:#fff;padding:7px 10px;text-align:left;}
  td{padding:7px 10px;border-bottom:1px solid #ddd;vertical-align:top;}
  .pass{color:#006400;font-weight:bold;} .fail{color:#c00;font-weight:bold;} .needs_info{color:#b8860b;font-weight:bold;}
  .rfi{border-left:3px solid #111;padding:8px 12px;margin-bottom:8px;background:#f9f9f9;}
  p{font-size:13px;}
  .footer{margin-top:48px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<h1>${audit.fund_name}</h1>
<div class="meta">Financial Year ${audit.financial_year || "—"}${audit.fund_abn ? ` · ABN ${audit.fund_abn}` : ""} · Audit Report</div>
<h2>Opinion</h2>
<div class="opinion">${opinion}</div>
${env.opinion_reasoning ? `<p>${env.opinion_reasoning}</p>` : ""}
${env.summary ? `<p>${env.summary}</p>` : ""}
<h2>Compliance Findings</h2>
<table><thead><tr><th>Area</th><th>Status</th><th>Detail</th><th>Reference</th></tr></thead><tbody>
${f.map(r => `<tr><td>${r.area}</td><td class="${normalizeStatus(r.status)}">${r.status}</td><td>${r.detail || ""}</td><td>${r.reference || ""}</td></tr>`).join("")}
</tbody></table>
${rfis.length > 0 ? `<h2>Requests for Information (${rfis.length})</h2>${rfis.map(r => `<div class="rfi"><strong>${r.title}</strong><br/>${r.category || ""} · ${r.priority || "medium"} · ${r.status || ""}<p>${r.description || ""}</p></div>`).join("")}` : ""}
<div class="footer">DRAFT — Generated by Auditron · ${new Date().toLocaleDateString("en-AU", {day:"numeric",month:"long",year:"numeric"})}</div>
</body></html>`;

      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
      else toast({ title: "Allow pop-ups for this site", variant: "destructive" });
    } finally { setDownloading(null); }
  };

  const handleDownloadManagementLetter = async (e?: any) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!audit?.ai_findings) {
      toast({ title: "Run the AI audit first", variant: "destructive" });
      return;
    }
    setDownloading("report");
    try {
      const { findings: f } = parseFindings(audit.ai_findings);
      const { data: rfiData } = await supabase.from("rfis").select("*").eq("audit_id", audit.id).eq("status", "open");
      const rfis = rfiData || [];
      const issues = f.filter(x => normalizeStatus(x.status) !== "pass");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Management Letter — ${audit.fund_name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5;}
  h1{font-size:22px;margin-bottom:2px;} h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #111;padding-bottom:4px;margin-top:32px;}
  .issue{border-left:3px solid #c00;padding:8px 12px;margin-bottom:8px;background:#fff5f5;}
  .rfi{border-left:3px solid #111;padding:8px 12px;margin-bottom:8px;background:#f9f9f9;}
  p{font-size:13px;} .footer{margin-top:48px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<h1>Management Letter</h1>
<p>Fund: ${audit.fund_name}<br/>Financial Year: ${audit.financial_year || "—"}${audit.fund_abn ? `<br/>ABN: ${audit.fund_abn}` : ""}<br/>Date: ${new Date().toLocaleDateString("en-AU", {day:"numeric",month:"long",year:"numeric"})}</p>
<p>We have completed our audit of ${audit.fund_name} for the financial year ${audit.financial_year || "—"}. The draft opinion is ${(audit.opinion || "pending").toUpperCase()}. The following matters require your attention.</p>
${issues.length > 0 ? `<h2>Compliance Issues (${issues.length})</h2>${issues.map(i => `<div class="issue"><strong>${i.area} — ${i.status}</strong><p>${i.detail || ""}</p>${i.reference ? `<small>${i.reference}</small>` : ""}</div>`).join("")}` : "<p>No compliance issues identified.</p>"}
${rfis.length > 0 ? `<h2>Outstanding Requests for Information (${rfis.length})</h2>${rfis.map(r => `<div class="rfi"><strong>${r.title}</strong><br/>${r.category || ""} · ${r.priority || "medium"}<p>${r.description || ""}</p></div>`).join("")}` : ""}
<p>Please respond to the above items at your earliest convenience.</p>
<div class="footer">DRAFT — Generated by Auditron · ${new Date().toLocaleDateString("en-AU", {day:"numeric",month:"long",year:"numeric"})}</div>
</body></html>`;

      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
      else toast({ title: "Allow pop-ups for this site", variant: "destructive" });
    } finally { setDownloading(null); }
  };

  const handleDownloadFindingsSummary = async (e?: any) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!audit?.ai_findings) {
      toast({ title: "Run the AI audit first", variant: "destructive" });
      return;
    }
    setDownloading("findings");
    try {
      const { findings: f } = parseFindings(audit.ai_findings);
      const pass = f.filter(x => normalizeStatus(x.status) === "pass").length;
      const fail = f.filter(x => normalizeStatus(x.status) === "fail").length;
      const info = f.filter(x => normalizeStatus(x.status) === "needs_info").length;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Findings Summary — ${audit.fund_name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5;}
  h1{font-size:22px;margin-bottom:2px;} h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #111;padding-bottom:4px;margin-top:32px;}
  .stats{display:flex;gap:24px;margin:16px 0;}
  .stat{text-align:center;padding:12px 20px;border-radius:8px;background:#f5f5f5;}
  .stat .num{font-size:28px;font-weight:bold;} .stat .lbl{font-size:11px;text-transform:uppercase;color:#666;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;}
  th{background:#111;color:#fff;padding:7px 10px;text-align:left;}
  td{padding:7px 10px;border-bottom:1px solid #ddd;vertical-align:top;}
  .pass{color:#006400;font-weight:bold;} .fail{color:#c00;font-weight:bold;} .needs_info{color:#b8860b;font-weight:bold;}
  .footer{margin-top:48px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<h1>Findings Summary — ${audit.fund_name}</h1>
<p>FY ${audit.financial_year || "—"} · Opinion: ${(audit.opinion || "pending").toUpperCase()}</p>
<div class="stats">
  <div class="stat"><div class="num" style="color:#006400">${pass}</div><div class="lbl">Pass</div></div>
  <div class="stat"><div class="num" style="color:#c00">${fail}</div><div class="lbl">Fail</div></div>
  <div class="stat"><div class="num" style="color:#b8860b">${info}</div><div class="lbl">Needs Info</div></div>
  <div class="stat"><div class="num">${f.length}</div><div class="lbl">Total</div></div>
</div>
<h2>All Findings</h2>
<table><thead><tr><th>Area</th><th>Status</th><th>Detail</th></tr></thead><tbody>
${f.map(r => `<tr><td>${r.area}</td><td class="${normalizeStatus(r.status)}">${r.status}</td><td>${r.detail || ""}</td></tr>`).join("")}
</tbody></table>
<div class="footer">DRAFT — Generated by Auditron · ${new Date().toLocaleDateString("en-AU", {day:"numeric",month:"long",year:"numeric"})}</div>
</body></html>`;

      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
      else toast({ title: "Allow pop-ups for this site", variant: "destructive" });
    } finally { setDownloading(null); }
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
    // Only update audit status — do NOT bulk-resolve RFIs from frontend
    await supabase.from("audits").update({ status: "complete" }).eq("id", audit.id);
    await Promise.all([fetchAudit(), fetchCounts()]);
    setCompleteConfirmOpen(false);
    setPendingStatus(null);
    toast({ title: "Audit marked complete" });
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
                  <DropdownMenuItem onClick={handleDownloadAuditReport} disabled={!!downloading}>
                    Download Audit Report PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadManagementLetter} disabled={!!downloading}>
                    Download Management Letter PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadFindingsSummary} disabled={!!downloading}>
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
            <UploadMoreDocuments auditId={audit.id} onUploaded={async () => { await fetchCounts(); }} runningAudit={runningAudit} />
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
              {/* Auditor Review Summary */}
              {envelope.auditor_review_summary && (
                <div className="rounded-lg border border-status-flag-border bg-status-flag-bg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-status-flag shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-status-flag">Items Requiring Auditor Review</p>
                    <p className="text-sm text-foreground mt-1">{envelope.auditor_review_summary}</p>
                    {reviewCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{reviewCount} finding{reviewCount !== 1 ? "s" : ""} require auditor attention</p>
                    )}
                  </div>
                </div>
              )}

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

              {/* Emphasis of Matter */}
              {envelope.emphasis_of_matter && envelope.emphasis_of_matter.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Emphasis of Matter
                  </p>
                  <div className="space-y-1.5 pl-6">
                    {envelope.emphasis_of_matter.map((item, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Findings — gated behind payment */}
              {(() => {
                const showGate = !isPaid && aiFindings.length > 0;

                const renderFinding = (f: AiFinding, i: number) => {
                  const isRemediated = f.remediated === true && normalizeStatus(f.status) === "fail";
                  return (
                    <div key={`${f.area}-${i}`} className={`rounded-lg border border-border bg-background p-4 space-y-2 ${findingLeftBorder(f.status, isRemediated)} ${isRemediated ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {findingIcon(f.status)}
                          <span className={`font-semibold text-sm ${isRemediated ? "line-through" : ""}`}>{f.area}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {confidenceDot(f.confidence)}
                          <Badge variant={findingBadgeVariant(f.status)}>{findingLabel(f.status)}</Badge>
                          {isRemediated && <Badge variant="secondary">Remediated</Badge>}
                        </div>
                      </div>
                      <p className={`text-sm text-muted-foreground leading-relaxed ${isRemediated ? "line-through" : ""}`}>{f.detail}</p>
                      <p className="text-xs text-muted-foreground">{f.reference}</p>
                      {f.judgment_flag && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-status-flag hover:underline cursor-pointer pt-1">
                            <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Auditor Notes
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2 space-y-1.5 pl-4 border-l-2 border-status-flag-border ml-1">
                            <p className="text-xs"><span className="font-medium text-foreground">Reason:</span> <span className="text-muted-foreground">{f.judgment_flag.reason}</span></p>
                            <p className="text-xs"><span className="font-medium text-foreground">Suggested Action:</span> <span className="text-muted-foreground">{f.judgment_flag.suggested_action}</span></p>
                            <p className="text-xs"><span className="font-medium text-foreground">Risk if Missed:</span> <span className="text-status-fail">{f.judgment_flag.risk_if_missed}</span></p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    <div style={showGate ? { filter: "blur(6px)", pointerEvents: "none", userSelect: "none" } as React.CSSProperties : undefined}>
                      <div className="grid gap-4 md:grid-cols-2">
                        {aiFindings.map((f, i) => renderFinding(f, i))}
                      </div>
                      {envelope.other_matters && envelope.other_matters.length > 0 && (
                        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2 mt-4">
                          <p className="text-sm font-semibold text-muted-foreground">Other Matters</p>
                          <div className="space-y-1.5">
                            {envelope.other_matters.map((item, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground leading-relaxed">• {item}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {showGate && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)" }}>
                        <div className="rounded-xl border border-border bg-background p-8 text-center max-w-sm shadow-xl">
                          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-bold">Your audit is ready</h3>
                          <p className="text-sm text-muted-foreground mt-1">Unlock the full compliance analysis for this fund</p>
                          <Button
                            className="mt-5 w-full bg-[hsl(142,72%,36%)] hover:bg-[hsl(142,72%,30%)] text-white font-semibold"
                            size="lg"
                            onClick={handleUnlockAudit}
                            disabled={unlocking}
                          >
                            {unlocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Unlock Full Audit — $29 AUD
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">Secure payment via Stripe · One-time fee</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
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
          {/* Auditor Instructions for AI */}
          <div className="rounded-lg border border-border bg-background p-5 space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Auditor Notes for AI
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These notes will be included as instructions for the AI audit analysis. Use this to provide context the AI should consider, e.g. &lsquo;Trustee confirmed Starboard investment resolved&rsquo; or &lsquo;Property was sold in July — do not flag valuation.&rsquo;
            </p>
            <Textarea
              placeholder="Enter notes or instructions for the AI…"
              value={auditorNotes}
              onChange={(e) => setAuditorNotes(e.target.value)}
              className="min-h-[120px] resize-y"
            />
            <div className="flex justify-end">
              <Button size="sm" disabled={savingAuditorNotes} onClick={handleSaveAuditorNotes}>
                {savingAuditorNotes ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Save Notes
              </Button>
            </div>
          </div>

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
