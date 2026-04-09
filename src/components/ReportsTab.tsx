import { useState } from "react";
import { FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { generateReportPdf } from "@/lib/reportDownloads";
import { generateReportDocx } from "@/lib/reportDownloads";

const API_BASE = "https://auditron-server-production.up.railway.app";

interface ReportDef {
  label: string;
  type: string;
  conditionKey?: "contraventions" | "completed";
}

const ALL_REPORTS: ReportDef[] = [
  { label: "Audit Planning Memorandum", type: "audit_planning" },
  { label: "Independent Auditor's Report (IAR)", type: "iar" },
  { label: "Management Letter", type: "management_letter" },
  { label: "Engagement Letter", type: "engagement_letter" },
  { label: "Trustee Representation Letter", type: "rep_letter" },
  { label: "Audit Working Papers", type: "workpapers", conditionKey: "completed" },
  { label: "s129 Contravention Notice", type: "s129_notice", conditionKey: "contraventions" },
  { label: "ACR Assessment", type: "acr_assessment", conditionKey: "contraventions" },
];

interface Props {
  auditId: string;
  fundName: string;
  financialYear: string | null;
  aiFindings: any;
  auditStatus?: string | null;
}

/** Parse content into structured sections for display */
function parseReportSections(content: string) {
  const lines = content.split("\n");
  const sections: { type: "major-header" | "sub-header" | "divider" | "text"; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      sections.push({ type: "text", text: "" });
    } else if (/^[═]{3,}$/.test(trimmed)) {
      sections.push({ type: "divider", text: "major" });
    } else if (/^[─]{3,}/.test(trimmed) || /^──/.test(trimmed)) {
      // Sub-header: text after the ── chars
      const headerText = trimmed.replace(/^[─]+\s*/, "").replace(/\s*[─]+$/, "");
      sections.push({ type: "sub-header", text: headerText || trimmed });
    } else if (
      lines[lines.indexOf(line) + 1]?.trim().match(/^[═]{3,}$/) ||
      (trimmed.length >= 4 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !trimmed.includes("|"))
    ) {
      sections.push({ type: "major-header", text: trimmed });
    } else {
      sections.push({ type: "text", text: line });
    }
  }
  return sections;
}

function ReportContentDisplay({ content }: { content: string }) {
  const sections = parseReportSections(content);

  return (
    <div className="space-y-1">
      {sections.map((section, i) => {
        switch (section.type) {
          case "major-header":
            return (
              <div key={i} className="pt-4 pb-1">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">
                  {section.text}
                </h3>
              </div>
            );
          case "divider":
            return <hr key={i} className="border-t-2 border-border my-2" />;
          case "sub-header":
            return (
              <div key={i} className="mt-3 mb-1 pt-2 border-t border-border/50">
                <h4 className="text-sm font-semibold text-foreground">{section.text}</h4>
              </div>
            );
          case "text":
            if (!section.text.trim()) return <div key={i} className="h-2" />;
            return (
              <p key={i} className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {section.text}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function ReportsTab({ auditId, fundName, financialYear, aiFindings, auditStatus }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [reportMeta, setReportMeta] = useState<{ fund_name: string; report_type: string; financial_year: string }>({
    fund_name: "",
    report_type: "",
    financial_year: "",
  });

  const hasContraventions = (() => {
    if (!aiFindings) return false;
    try {
      const obj = typeof aiFindings === "string" ? JSON.parse(aiFindings) : aiFindings;
      if (Array.isArray(obj?.contraventions) && obj.contraventions.length > 0) return true;
      if (Array.isArray(obj?.compliance_findings)) {
        return obj.compliance_findings.some((f: any) => f.status?.toLowerCase() === "fail");
      }
      return false;
    } catch {
      return false;
    }
  })();

  const isCompleted = auditStatus === "complete" || auditStatus === "in_progress";

  const visibleReports = ALL_REPORTS.filter((r) => {
    if (r.conditionKey === "contraventions") return hasContraventions;
    if (r.conditionKey === "completed") return isCompleted;
    return true;
  });

  const handleGenerate = async (report: ReportDef) => {
    setLoading(report.type);
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ audit_id: auditId, report_type: report.type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to generate report");
      }
      const data = await res.json();
      setReportContent(data.content || "No content returned.");
      setReportTitle(report.label);
      setReportMeta({
        fund_name: data.fund_name || fundName,
        report_type: report.type,
        financial_year: data.financial_year || financialYear || "",
      });
      setModalOpen(true);
    } catch (err: any) {
      toast({ title: "Report generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const fileBaseName = `${reportMeta.fund_name} - ${reportTitle} - FY${reportMeta.financial_year}`;

  const isNoContent =
    !reportContent.trim() ||
    reportContent.toLowerCase().includes("no contraventions identified") ||
    reportContent.toLowerCase().includes("no content");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Generate Reports
        </h3>
        <p className="text-xs text-muted-foreground">
          Generate formal audit documents from the AI findings. Each report is produced by the server and can be downloaded as PDF or Word.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleReports.map((report) => (
            <Button
              key={report.type}
              variant={report.type === "workpapers" ? "default" : "outline"}
              className={`justify-start h-auto py-3 px-4 ${report.type === "workpapers" ? "sm:col-span-2" : ""}`}
              disabled={!!loading}
              onClick={() => handleGenerate(report)}
            >
              {loading === report.type ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
              ) : (
                <FileText className="h-4 w-4 mr-2 shrink-0" />
              )}
              <span className="text-left">{report.label}</span>
            </Button>
          ))}
        </div>

        {isCompleted && (
          <p className="text-xs text-muted-foreground">
            Working papers are retained on the platform for 7 years in accordance with ASIC requirements.
          </p>
        )}

        {hasContraventions && (
          <div className="flex items-center gap-2 text-xs text-status-fail">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Contraventions detected — s129 Notice and ACR Assessment available</span>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {reportTitle}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {reportMeta.fund_name} · FY{reportMeta.financial_year}
              </span>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-muted/30 p-4">
            <ReportContentDisplay content={reportContent} />
          </ScrollArea>

          {!isNoContent ? (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button size="sm" onClick={() => generateReportPdf(reportContent, reportMeta.fund_name, reportMeta.financial_year, fileBaseName)}>
                <Download className="h-4 w-4 mr-1.5" />
                Download as PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateReportDocx(reportContent, fileBaseName)}>
                <Download className="h-4 w-4 mr-1.5" />
                Download as Word
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">{reportContent}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
