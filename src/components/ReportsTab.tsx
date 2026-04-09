import { useState } from "react";
import { FileText, Download, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

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
      setReportTitle(`${report.label}`);
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

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(reportContent, pageWidth);
    let y = margin;
    for (const line of lines) {
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }
    doc.save(`${fileBaseName}.pdf`);
  };

  const handleDownloadDocx = async () => {
    const paragraphs = reportContent.split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line || " ", font: "Calibri", size: 22 })],
          spacing: { after: 100 },
        })
    );
    const docxDoc = new Document({
      sections: [{ children: paragraphs }],
    });
    const buffer = await Packer.toBlob(docxDoc);
    saveAs(buffer, `${fileBaseName}.docx`);
  };

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
              variant="outline"
              className="justify-start h-auto py-3 px-4"
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

        {hasContraventions && (
          <div className="flex items-center gap-2 text-xs text-status-fail">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Contraventions detected — s129 Notice and ACR Assessment available</span>
          </div>
        )}
      </div>

      {/* Report Content Modal */}
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
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {reportContent}
            </pre>
          </ScrollArea>

          {!isNoContent ? (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1.5" />
                Download as PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadDocx}>
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
