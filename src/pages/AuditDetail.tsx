import { useParams, Link } from "react-router-dom";
import { ChevronRight, Download, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { audits, findings, auditDocuments, rfis, type FindingStatus } from "@/lib/mockData";

const findingIcon = (s: FindingStatus) => {
  if (s === "Pass") return <CheckCircle2 className="h-4 w-4 text-status-pass" />;
  if (s === "Flag") return <AlertTriangle className="h-4 w-4 text-status-flag" />;
  return <XCircle className="h-4 w-4 text-status-fail" />;
};

const statusVariant = (s: string) => {
  const map: Record<string, "new" | "in-progress" | "pass" | "secondary" | "flag"> = {
    New: "new", "In Progress": "in-progress", Complete: "pass", "On Hold": "secondary", "RFI Sent": "flag",
  };
  return map[s] || "secondary";
};

export default function AuditDetail() {
  const { id } = useParams();
  const audit = audits.find(a => a.id === id) || audits[0];
  const auditRfis = rfis.filter(r => r.fundName === audit.fundName);
  const openRfis = auditRfis.filter(r => r.status !== "Resolved");
  const resolvedRfis = auditRfis.filter(r => r.status === "Resolved");

  const passCount = findings.filter(f => f.status === "Pass").length;
  const flagCount = findings.filter(f => f.status === "Flag").length;

  return (
    <div className="container max-w-6xl py-6 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">My Audits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{audit.fundName}</span>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif-display text-2xl font-semibold">{audit.fundName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Financial Year {audit.year}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-1.5" />Download</Button>
            <Button variant="accent" size="sm"><ShieldCheck className="h-4 w-4 mr-1.5" />Approve & Sign</Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <Badge variant={statusVariant(audit.status)}>{audit.status}</Badge>
          <span className="text-muted-foreground">Requested: {audit.dateRequested}</span>
          <span className="text-muted-foreground">Auditor: {audit.auditor}</span>
          <span className="text-muted-foreground">Turnaround: {audit.turnaround}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="findings">AI Findings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          {/* Opinion Banner */}
          <div className="flex items-center gap-3 rounded-xl bg-status-pass/10 border border-status-pass/20 p-4">
            <CheckCircle2 className="h-5 w-5 text-status-pass shrink-0" />
            <div>
              <p className="font-medium text-sm">Draft Opinion: Unqualified</p>
              <p className="text-xs text-muted-foreground mt-0.5">{passCount} areas passed, {flagCount} flagged for review. No material breaches identified.</p>
            </div>
          </div>

          {/* Findings Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {findings.map(f => (
              <div key={f.area} className="rounded-xl border bg-card p-4 space-y-2 transition-all hover:shadow-sm">
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
        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-serif-display font-semibold">Pre-Audit Documents</h3>
              {["Engagement Letter.pdf", "Trustee Representation Letter.pdf"].map(doc => (
                <div key={doc} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc}</span>
                  </div>
                  <Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-serif-display font-semibold">Audit Documents</h3>
              {auditDocuments.map(doc => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm">{doc.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{doc.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{doc.date}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* RFIs Tab */}
        <TabsContent value="rfis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-serif-display font-semibold">Open RFIs</h3>
              {openRfis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open RFIs for this fund.</p>
              ) : openRfis.map(rfi => (
                <div key={rfi.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{rfi.title}</span>
                    <Badge variant={rfi.priority === "High" ? "high" : rfi.priority === "Med" ? "medium" : "low"}>{rfi.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rfi.category} · {rfi.timeAgo}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-serif-display font-semibold">Resolved RFIs</h3>
              {resolvedRfis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resolved RFIs for this fund.</p>
              ) : resolvedRfis.map(rfi => (
                <div key={rfi.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{rfi.title}</span>
                    <Badge variant="pass">Resolved</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rfi.category} · {rfi.timeAgo}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
