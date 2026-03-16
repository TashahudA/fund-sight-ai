import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Download, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileText, Plus, StickyNote, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { findings, rfis, auditNotes, type FindingStatus } from "@/lib/mockData";
import { RFITab } from "@/components/RFITab";
import { DocumentsTab } from "@/components/DocumentsTab";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Audit = Tables<"audits">;

const findingIcon = (s: FindingStatus) => {
  if (s === "Pass") return <CheckCircle2 className="h-4 w-4 text-status-pass" />;
  if (s === "Flag") return <AlertTriangle className="h-4 w-4 text-status-flag" />;
  return <XCircle className="h-4 w-4 text-status-fail" />;
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

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const fetchAudit = async () => {
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
    };
    fetchAudit();
  }, [id]);

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

  const passCount = findings.filter(f => f.status === "Pass").length;
  const flagCount = findings.filter(f => f.status === "Flag").length;

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
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="findings">AI Findings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
          <TabsTrigger value="notes">Audit Notes</TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-status-pass/10 border border-status-pass/20 p-4">
            <CheckCircle2 className="h-5 w-5 text-status-pass shrink-0" />
            <div>
              <p className="font-medium text-sm">Draft Opinion: {audit.opinion || "Pending"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{passCount} areas passed, {flagCount} flagged for review.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {findings.map(f => (
              <div key={f.area} className="rounded-xl bg-card p-4 space-y-2 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {findingIcon(f.status)}
                    <span className="font-medium text-sm">{f.area}</span>
                  </div>
                  <Badge variant={f.status === "Pass" ? "pass" : f.status === "Flag" ? "flag" : "fail"}>{f.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.detail}</p>
                <p className="text-xs text-muted-foreground italic">{f.reference}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab auditId={audit.id} />
        </TabsContent>

        {/* RFIs Tab */}
        <TabsContent value="rfis">
          <RFISplitPanel rfis={rfis} showRaiseButton className="h-[calc(100vh-22rem)]" />
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
