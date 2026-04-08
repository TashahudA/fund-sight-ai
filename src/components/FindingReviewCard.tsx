import { useState } from "react";
import { CheckCircle2, Eye, XCircle, CircleDot, Info, ChevronRight, Loader2, MessageSquare, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

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

export interface ReviewAction {
  finding_area: string;
  action: "agree" | "override" | "note";
  note?: string | null;
  reviewed_by: string;
  reviewed_at?: string;
}

interface Props {
  finding: AiFinding;
  index: number;
  auditId: string;
  reviewerName: string;
  existingReviews: ReviewAction[];
  onReviewSaved: (review: ReviewAction) => void;
}

const API_BASE = "https://auditron-server-production.up.railway.app";

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

export function FindingReviewCard({ finding: f, index, auditId, reviewerName, existingReviews, onReviewSaved }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [resolveText, setResolveText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [editingOverrideIndex, setEditingOverrideIndex] = useState<number | null>(null);
  const [editOverrideText, setEditOverrideText] = useState("");

  const isRemediated = f.remediated === true && normalizeStatus(f.status) === "fail";
  const hasAgreed = existingReviews.some(r => r.action === "agree");
  const overrides = existingReviews.filter(r => r.action === "override");
  const hasResolved = overrides.length > 0;
  const notes = existingReviews.filter(r => r.action === "note");
  const isReviewed = existingReviews.length > 0;
  const isDecisionMade = hasAgreed || hasResolved;

  const saveReview = async (action: "agree" | "override" | "note", note?: string) => {
    setSaving(action);
    try {
      const body = {
        audit_id: auditId,
        finding_area: f.area,
        action,
        reviewed_by: reviewerName,
        ...(note ? { note } : {}),
      };
      const res = await fetch(`${API_BASE}/reviews/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to save review");
      }
      onReviewSaved({
        finding_area: f.area,
        action,
        note: note || null,
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
      });
      if (action === "agree") toast({ title: "Finding agreed" });
      if (action === "override") { toast({ title: "Finding resolved" }); setShowResolveInput(false); setResolveText(""); }
      if (action === "note") { toast({ title: "Note added" }); setShowNoteInput(false); setNoteText(""); }
    } catch (err: any) {
      toast({ title: "Failed to save review", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleEditOverride = (idx: number) => {
    setEditingOverrideIndex(idx);
    setEditOverrideText(overrides[idx]?.note || "");
  };

  const handleSaveEditOverride = async () => {
    if (editingOverrideIndex === null) return;
    setSaving("override");
    try {
      const body = {
        audit_id: auditId,
        finding_area: f.area,
        action: "override",
        reviewed_by: reviewerName,
        note: editOverrideText.trim(),
      };
      const res = await fetch(`${API_BASE}/reviews/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to update resolution");
      }
      onReviewSaved({
        finding_area: f.area,
        action: "override",
        note: editOverrideText.trim(),
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
      });
      toast({ title: "Resolution updated" });
      setEditingOverrideIndex(null);
      setEditOverrideText("");
    } catch (err: any) {
      toast({ title: "Failed to update resolution", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={`rounded-lg border border-border bg-background p-4 space-y-2 ${findingLeftBorder(f.status, isRemediated)} ${isRemediated ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasAgreed ? (
            <CheckCircle2 className="h-4 w-4 text-status-pass" />
          ) : (
            findingIcon(f.status)
          )}
          <span className={`font-semibold text-sm ${isRemediated ? "line-through" : ""}`}>{f.area}</span>
          {isReviewed && (
            <Badge variant="pass" className="text-[10px] px-1.5 py-0">Reviewed</Badge>
          )}
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

      {/* Resolution notes with edit */}
      {overrides.map((r, i) => (
        <div key={`override-${i}`} className="rounded border border-status-flag-border bg-status-flag-bg p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-status-flag">Resolved by {r.reviewed_by} on {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}</p>
            {editingOverrideIndex !== i && (
              <button
                onClick={() => handleEditOverride(i)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingOverrideIndex === i ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={editOverrideText}
                onChange={(e) => setEditOverrideText(e.target.value)}
                className="min-h-[50px] resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingOverrideIndex(null)}>Cancel</Button>
                <Button size="sm" disabled={!editOverrideText.trim() || !!saving} onClick={handleSaveEditOverride}>
                  {saving === "override" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Update
                </Button>
              </div>
            </div>
          ) : (
            r.note && <p className="text-muted-foreground">{r.note}</p>
          )}
        </div>
      ))}

      {/* Working paper notes */}
      {notes.map((r, i) => (
        <div key={`note-${i}`} className="rounded border border-border bg-muted/50 p-3 text-xs space-y-0.5">
          <p className="font-medium text-muted-foreground">{r.reviewed_by} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ""}</p>
          {r.note && <p className="text-foreground">{r.note}</p>}
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isDecisionMade || !!saving}
          onClick={() => saveReview("agree")}
          className={isDecisionMade ? "opacity-50" : ""}
        >
          {saving === "agree" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
          Agree
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDecisionMade || !!saving}
          onClick={() => setShowResolveInput(!showResolveInput)}
          className={isDecisionMade ? "opacity-50" : ""}
        >
          <FileText className="h-3 w-3 mr-1" />
          Resolve
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!!saving}
          onClick={() => setShowNoteInput(!showNoteInput)}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Add Note
        </Button>
      </div>

      {/* Resolve input — only when no decision made yet */}
      {showResolveInput && !isDecisionMade && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Explain why this finding is resolved..."
            value={resolveText}
            onChange={(e) => setResolveText(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowResolveInput(false)}>Cancel</Button>
            <Button size="sm" disabled={!resolveText.trim() || !!saving} onClick={() => saveReview("override", resolveText.trim())}>
              {saving === "override" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Submit Resolution
            </Button>
          </div>
        </div>
      )}

      {/* Note input — always available */}
      {showNoteInput && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Add working paper note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNoteInput(false)}>Cancel</Button>
            <Button size="sm" disabled={!noteText.trim() || !!saving} onClick={() => saveReview("note", noteText.trim())}>
              {saving === "note" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
