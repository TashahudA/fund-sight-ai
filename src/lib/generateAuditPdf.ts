import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AiFinding {
  area: string;
  status: string;
  detail: string;
  reference: string;
}

interface AiFindingsEnvelope {
  compliance_findings?: AiFinding[];
  opinion?: string;
  opinion_reasoning?: string;
  summary?: string;
}

interface RfiRow {
  title: string;
  category: string | null;
  priority: string | null;
  status: string | null;
  description: string | null;
}

interface DocRow {
  file_name: string;
  created_at: string | null;
}

interface AuditPdfData {
  fundName: string;
  fundAbn: string | null;
  financialYear: string | null;
  fundType: string | null;
  opinion: string | null;
  aiFindingsRaw: any;
  rfis: RfiRow[];
  documents: DocRow[];
}

const NAVY = [26, 54, 93] as const; // #1a365d
const GREEN = [34, 139, 34] as const;
const RED = [200, 30, 30] as const;
const AMBER = [200, 140, 20] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT_GRAY = [220, 220, 220] as const;
const WHITE = [255, 255, 255] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addFooters(doc: jsPDF, fundName: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");

    const y = PAGE_H - 10;
    doc.text("DRAFT — Auditron AI Audit Report", MARGIN, y);
    doc.text(fundName, PAGE_W / 2, y, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, y, { align: "right" });

    // Footer line
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
  }
}

function drawBadge(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  color: readonly [number, number, number]
) {
  const textW = doc.getTextWidth(text);
  const padX = 4;
  const padY = 1.5;
  const badgeW = textW + padX * 2;
  const badgeH = 5 + padY * 2;

  doc.setFillColor(...color);
  doc.roundedRect(x, y - padY - 4, badgeW, badgeH, 1.5, 1.5, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + padX, y);
  doc.setTextColor(0);

  return badgeW;
}

function statusColor(s: string): readonly [number, number, number] {
  const lower = s.toLowerCase();
  if (lower === "pass") return GREEN;
  if (lower === "fail") return RED;
  return AMBER;
}

function statusLabel(s: string): string {
  const lower = s.toLowerCase();
  if (lower === "pass") return "PASS";
  if (lower === "fail") return "FAIL";
  return "NEEDS INFO";
}

function opinionColor(o: string | null): readonly [number, number, number] {
  const lower = (o || "").toLowerCase();
  if (lower === "unqualified") return GREEN;
  if (lower === "qualified") return AMBER;
  if (lower === "adverse") return RED;
  return GRAY;
}

function parseEnvelope(raw: any): AiFindingsEnvelope {
  if (!raw) return {};
  try {
    let obj = raw;
    if (typeof obj === "string") {
      const match = obj.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) obj = JSON.parse(match[1]);
      else obj = JSON.parse(obj);
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    return {};
  } catch {
    return {};
  }
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 25) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

export function generateAuditPdf(data: AuditPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const envelope = parseEnvelope(data.aiFindingsRaw);
  const findings = Array.isArray(envelope.compliance_findings)
    ? envelope.compliance_findings
    : [];

  const normalizeStatus = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === "pass") return "pass";
    if (lower === "fail") return "fail";
    return "needs_info";
  };

  const passCount = findings.filter((f) => normalizeStatus(f.status) === "pass").length;
  const flagCount = findings.filter((f) => normalizeStatus(f.status) !== "pass").length;
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ─── PAGE 1: COVER ──────────────────────────────────────────────
  let y = 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.text("SMSF Compliance", PAGE_W / 2, y, { align: "center" });
  y += 12;
  doc.text("Audit Report", PAGE_W / 2, y, { align: "center" });

  y += 14;
  doc.setFontSize(14);
  doc.setTextColor(...AMBER);
  doc.text("DRAFT — For Review Only", PAGE_W / 2, y, { align: "center" });

  y += 24;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.5);
  doc.line(60, y, PAGE_W - 60, y);

  y += 16;
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(data.fundName, PAGE_W / 2, y, { align: "center" });

  y += 14;
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");

  if (data.fundAbn) {
    doc.text(`ABN: ${data.fundAbn}`, PAGE_W / 2, y, { align: "center" });
    y += 7;
  }
  if (data.financialYear) {
    doc.text(`Financial Year: ${data.financialYear}`, PAGE_W / 2, y, { align: "center" });
    y += 7;
  }
  if (data.fundType) {
    doc.text(`Fund Type: ${data.fundType.charAt(0).toUpperCase() + data.fundType.slice(1)}`, PAGE_W / 2, y, { align: "center" });
    y += 7;
  }
  doc.text(`Date Generated: ${today}`, PAGE_W / 2, y, { align: "center" });

  y += 24;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(60, y, PAGE_W - 60, y);

  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("Prepared by Auditron AI Audit Platform", PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.text(
    "This is a draft report for review by a registered SMSF auditor",
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  // ─── PAGE 2: EXECUTIVE SUMMARY ──────────────────────────────────
  doc.addPage();
  y = MARGIN + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("Executive Summary", MARGIN, y);
  y += 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + 50, y);
  y += 12;

  // Opinion
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Draft Opinion", MARGIN, y);
  y += 8;

  const opinionText = (data.opinion || "Pending").toUpperCase();
  drawBadge(doc, opinionText, MARGIN, y, opinionColor(data.opinion));
  y += 12;

  // Opinion reasoning
  if (envelope.opinion_reasoning) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Opinion Reasoning", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const reasonLines = doc.splitTextToSize(envelope.opinion_reasoning, CONTENT_W);
    for (const line of reasonLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 6;
  }

  // Summary
  if (envelope.summary) {
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Summary", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(envelope.summary, CONTENT_W);
    for (const line of summaryLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 6;
  }

  // Stats
  y = checkPageBreak(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("Statistics", MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`• ${passCount} area${passCount !== 1 ? "s" : ""} passed`, MARGIN + 4, y);
  y += 6;
  doc.text(`• ${flagCount} area${flagCount !== 1 ? "s" : ""} flagged for review`, MARGIN + 4, y);
  y += 6;
  doc.text(`• ${data.rfis.length} RFI${data.rfis.length !== 1 ? "s" : ""} raised`, MARGIN + 4, y);

  // ─── PAGE 3+: COMPLIANCE FINDINGS ───────────────────────────────
  if (findings.length > 0) {
    doc.addPage();
    y = MARGIN + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text("Compliance Findings", MARGIN, y);
    y += 4;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, MARGIN + 50, y);
    y += 12;

    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      const detailLines = doc.splitTextToSize(f.detail || "", CONTENT_W - 4);
      const refLines = doc.splitTextToSize(f.reference || "", CONTENT_W - 4);
      const neededHeight = 14 + detailLines.length * 5 + refLines.length * 4.5 + 10;

      y = checkPageBreak(doc, y, Math.min(neededHeight, 60));

      // Area name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(f.area, MARGIN, y);

      // Status badge next to area name
      const areaW = doc.getTextWidth(f.area);
      const label = statusLabel(f.status);
      const color = statusColor(f.status);
      doc.setFontSize(8);
      drawBadge(doc, label, MARGIN + areaW + 6, y, color);
      y += 8;

      // Detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      for (const line of detailLines) {
        y = checkPageBreak(doc, y, 6);
        doc.text(line, MARGIN + 2, y);
        y += 5;
      }

      // Reference
      if (f.reference) {
        y += 1;
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        for (const line of refLines) {
          y = checkPageBreak(doc, y, 5);
          doc.text(line, MARGIN + 2, y);
          y += 4.5;
        }
      }

      // Divider
      if (i < findings.length - 1) {
        y += 4;
        doc.setDrawColor(...LIGHT_GRAY);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 6;
      }
    }
  }

  // ─── RFIs PAGE ──────────────────────────────────────────────────
  if (data.rfis.length > 0) {
    doc.addPage();
    y = MARGIN + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text("Requests for Information", MARGIN, y);
    y += 4;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, MARGIN + 50, y);
    y += 10;

    const priorityColor = (p: string | null) => {
      const lower = (p || "").toLowerCase();
      if (lower === "high") return RED;
      if (lower === "low") return GREEN;
      return AMBER;
    };

    const tableBody = data.rfis.map((rfi) => [
      rfi.title,
      rfi.category || "—",
      (rfi.priority || "medium").charAt(0).toUpperCase() + (rfi.priority || "medium").slice(1),
      (rfi.status || "open").charAt(0).toUpperCase() + (rfi.status || "open").slice(1),
      (rfi.description || "").substring(0, 120) + ((rfi.description || "").length > 120 ? "…" : ""),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Title", "Category", "Priority", "Status", "Description"]],
      body: tableBody,
      margin: { left: MARGIN, right: MARGIN },
      headStyles: {
        fillColor: [...NAVY] as [number, number, number],
        textColor: [...WHITE] as [number, number, number],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [40, 40, 40],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: "auto" },
      },
      styles: {
        lineColor: [...LIGHT_GRAY] as [number, number, number],
        lineWidth: 0.3,
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 2) {
          const val = (hookData.cell.raw as string || "").toLowerCase();
          const c = priorityColor(val);
          hookData.cell.styles.textColor = [...c] as [number, number, number];
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });
  }

  // ─── DOCUMENTS PAGE ─────────────────────────────────────────────
  if (data.documents.length > 0) {
    doc.addPage();
    y = MARGIN + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text("Documents Reviewed", MARGIN, y);
    y += 4;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, MARGIN + 50, y);
    y += 10;

    const docBody = data.documents.map((d) => [
      d.file_name,
      d.created_at
        ? new Date(d.created_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["File Name", "Upload Date"]],
      body: docBody,
      margin: { left: MARGIN, right: MARGIN },
      headStyles: {
        fillColor: [...NAVY] as [number, number, number],
        textColor: [...WHITE] as [number, number, number],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [40, 40, 40],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 35 },
      },
      styles: {
        lineColor: [...LIGHT_GRAY] as [number, number, number],
        lineWidth: 0.3,
      },
    });
  }

  // ─── FOOTERS ────────────────────────────────────────────────────
  addFooters(doc, data.fundName);

  // ─── SAVE ───────────────────────────────────────────────────────
  const safeName = data.fundName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const safeYear = (data.financialYear || "").replace(/[^a-zA-Z0-9-]/g, "_") || "Unknown_Year";
  doc.save(`${safeName}_Audit_Report_${safeYear}.pdf`);
}
