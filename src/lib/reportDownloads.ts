import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  LevelFormat,
  TabStopType,
  PageBreak,
  Footer,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation (unchanged logic, just strips bad characters)
// ─────────────────────────────────────────────────────────────────────────────

export function generateReportPdf(content: string, fundName: string, financialYear: string, fileBaseName: string) {
  // Workpaper JSON gets a fully formatted PDF — no plain-text fallback
  if (content.startsWith("__WORKPAPER_JSON__")) {
    buildWorkpaperPdf(content, fundName, financialYear, fileBaseName);
    return;
  }
  const text = content;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;

  const lines = text.split("\n");
  let y = margin;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      y += 4;
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
      continue;
    }

    if (/^[-]{3,}$/.test(trimmed)) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + pageWidth, y);
      y += 5;
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
      continue;
    }

    // Section heading detection: all caps, no numbers, reasonable length
    const isHeading =
      trimmed.length >= 4 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !trimmed.includes("|") &&
      trimmed.length < 80;

    if (isHeading) {
      y += 3;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const wrapped = doc.splitTextToSize(trimmed, pageWidth);
      for (const wl of wrapped) {
        if (y > pageHeight + margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(wl, margin, y);
        y += 6;
      }
      y += 1;
      continue;
    }

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const sanitized = trimmed.replace(/[^\x00-\x7E]/g, "");
    const wrapped = doc.splitTextToSize(sanitized, pageWidth);
    for (const wl of wrapped) {
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(wl, margin, y);
      y += 5;
    }
    y += 1;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("times", "normal");
    doc.text(fundName, margin, fy);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - margin, fy, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper PDF — fully formatted (cover, sections, tables, opinion, sign-off)
// ─────────────────────────────────────────────────────────────────────────────

function buildWorkpaperPdf(content: string, fundName: string, financialYear: string, fileBaseName: string) {
  const NAVY: [number, number, number] = [28, 43, 69];     // #1C2B45
  const GREY_BG: [number, number, number] = [242, 242, 242]; // #F2F2F2
  const GREY_HEAD: [number, number, number] = [220, 220, 220];
  const BORDER: [number, number, number] = [180, 180, 180];
  const GREEN: [number, number, number] = [22, 128, 60];
  const ORANGE: [number, number, number] = [200, 110, 20];
  const RED: [number, number, number] = [180, 30, 40];

  let wp: any;
  try {
    wp = JSON.parse(content.replace("__WORKPAPER_JSON__", ""));
  } catch {
    // Fallback: render as plain text
    const fallback = content.replace("__WORKPAPER_JSON__", "");
    const docF = new jsPDF({ unit: "mm", format: "a4" });
    docF.setFont("times", "normal");
    docF.setFontSize(9);
    docF.text(docF.splitTextToSize(fallback, 170), 20, 20);
    docF.save(`${fileBaseName}.pdf`);
    return;
  }

  const meta = wp.meta || {};
  const fund = meta.fundName || fundName;
  const year = meta.financialYear || financialYear;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_RESERVE = 18;
  let y = MARGIN;

  const sanitize = (s: any) => String(s ?? "").replace(/[^\x00-\x7E]/g, "");

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const statusColor = (status: string): [number, number, number] => {
    const s = String(status ?? "").toLowerCase();
    if (s === "pass") return GREEN;
    if (s === "fail") return RED;
    return ORANGE;
  };

  // ── COVER BLOCK ─────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("AUDIT WORKING PAPERS", PAGE_W / 2, 30, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("times", "normal");
  doc.text(sanitize(fund), PAGE_W / 2, 48, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Year ended 30 June ${sanitize(year)}`, PAGE_W / 2, 60, { align: "center" });
  if (meta.fundABN) {
    doc.setFontSize(9);
    doc.text(`ABN ${sanitize(meta.fundABN)}`, PAGE_W / 2, 70, { align: "center" });
  }
  y = 95;

  // ── Section header bar ──────────────────────────────────────
  const sectionHeader = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(sanitize(title), MARGIN + 3, y + 5.6);
    y += 11;
  };

  // ── Finding card ────────────────────────────────────────────
  const renderFinding = (f: any, idx: number) => {
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const detail = sanitize(f.detail || f.description || "");
    const detailLines = doc.splitTextToSize(detail, CONTENT_W - 6);
    const cardH = 8 + Math.max(detailLines.length * 4.2, 6) + 7;
    ensureSpace(cardH + 2);

    // alternate row bg
    if (idx % 2 === 1) {
      doc.setFillColor(...GREY_BG);
      doc.rect(MARGIN, y, CONTENT_W, cardH, "F");
    }
    // outer border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, CONTENT_W, cardH);

    // header strip
    doc.setFillColor(...GREY_HEAD);
    doc.rect(MARGIN, y, CONTENT_W, 7, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(sanitize(f.area || f.title || "—"), MARGIN + 3, y + 4.8);
    doc.setFont("times", "normal");
    doc.text(sanitize(f.reference || f.section || ""), MARGIN + CONTENT_W * 0.55, y + 4.8);

    const status = String(f.status ?? "").toUpperCase().replace(/_/g, " ");
    const [sr, sg, sb] = statusColor(f.status);
    doc.setFont("times", "bold");
    doc.setTextColor(sr, sg, sb);
    doc.text(status || "—", MARGIN + CONTENT_W - 3, y + 4.8, { align: "right" });

    // detail body
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    let ty = y + 11;
    for (const dl of detailLines) {
      doc.text(dl, MARGIN + 3, ty);
      ty += 4.2;
    }

    // sign-off line
    doc.setDrawColor(...BORDER);
    doc.line(MARGIN, y + cardH - 5, MARGIN + CONTENT_W, y + cardH - 5);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("Auditor sign-off: ______________________   Date: ______________", MARGIN + 3, y + cardH - 1.5);

    y += cardH + 2;
  };

  // ── Generic table renderer ──────────────────────────────────
  const renderTable = (headers: string[], widths: number[], rows: string[][]) => {
    const totalRel = widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((w) => (w / totalRel) * CONTENT_W);
    const rowH = 6;

    ensureSpace(rowH + 4);
    // header
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    let cx = MARGIN;
    headers.forEach((h, i) => {
      doc.text(sanitize(h), cx + 2, y + 4.2);
      cx += colW[i];
    });
    y += rowH;

    // body
    doc.setFont("times", "normal");
    doc.setTextColor(30, 30, 30);
    rows.forEach((row, rIdx) => {
      const wrapped = row.map((cell, i) => doc.splitTextToSize(sanitize(cell), colW[i] - 4));
      const lineCount = Math.max(...wrapped.map((w) => w.length), 1);
      const h = lineCount * 4.2 + 2;
      ensureSpace(h);
      if (rIdx % 2 === 1) {
        doc.setFillColor(...GREY_BG);
        doc.rect(MARGIN, y, CONTENT_W, h, "F");
      }
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, h);
      let bx = MARGIN;
      wrapped.forEach((lines, i) => {
        let ty = y + 4;
        for (const ln of lines) {
          doc.text(ln, bx + 2, ty);
          ty += 4.2;
        }
        bx += colW[i];
      });
      y += h;
    });
    y += 4;
  };

  // ── SECTION A & B: Findings ─────────────────────────────────
  const renderFindingSection = (title: string, findings: any[]) => {
    sectionHeader(title);
    if (!findings || !findings.length) {
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      ensureSpace(6);
      doc.text("No findings recorded.", MARGIN, y + 4);
      y += 8;
      return;
    }
    findings.forEach((f, i) => renderFinding(f, i));
  };

  renderFindingSection("SECTION A — FINANCIAL AUDIT WORKING PAPERS", wp.partAFindings || []);
  renderFindingSection("SECTION B — COMPLIANCE ENGAGEMENT WORKING PAPERS", wp.partBFindings || []);

  // ── SECTION C: Deterministic checks (if present) ────────────
  if (wp.deterministicBlock) {
    sectionHeader("SECTION C — DETERMINISTIC CHECKS");
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(sanitize(wp.deterministicBlock), CONTENT_W);
    for (const ln of lines) {
      ensureSpace(5);
      doc.text(ln, MARGIN, y + 4);
      y += 4.5;
    }
    y += 4;
  }

  // ── SECTION D: Contraventions table ─────────────────────────
  sectionHeader("SECTION D — CONTRAVENTIONS");
  if (wp.contraventions && wp.contraventions.length) {
    renderTable(
      ["Area", "SIS Section", "Severity", "Details"],
      [25, 18, 15, 42],
      wp.contraventions.map((c: any) => [c.area || "—", c.section || "—", c.severity || "—", c.description || "—"]),
    );
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    ensureSpace(6);
    doc.text("No contraventions identified.", MARGIN, y + 4);
    y += 8;
  }

  // ── SECTION E: RFIs table ───────────────────────────────────
  sectionHeader("SECTION E — REQUESTS FOR INFORMATION");
  if (wp.rfis && wp.rfis.length) {
    renderTable(
      ["Priority", "Title", "Description", "Status"],
      [15, 25, 45, 15],
      wp.rfis.map((r: any) => [r.priority || "—", r.title || "—", r.description || "—", r.status || "—"]),
    );
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    ensureSpace(6);
    doc.text("No RFIs raised.", MARGIN, y + 4);
    y += 8;
  }

  // ── SECTION F: Opinion ──────────────────────────────────────
  sectionHeader("SECTION F — OPINION AND CONCLUSION");
  const opinionRaw = String(wp?.opinion?.overall ?? "").toUpperCase();
  let opLabel = opinionRaw || "—";
  let opColor: [number, number, number] = [40, 40, 40];
  if (/UNQUALIFIED|UNMODIFIED/.test(opinionRaw)) {
    opLabel = "UNQUALIFIED";
    opColor = GREEN;
  } else if (/ADVERSE|DISCLAIM/.test(opinionRaw)) {
    opColor = RED;
  } else if (/QUALIFIED|MODIFIED/.test(opinionRaw)) {
    opLabel = "QUALIFIED";
    opColor = ORANGE;
  }
  ensureSpace(14);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...opColor);
  doc.text(opLabel, MARGIN, y + 8);
  y += 14;

  if (wp?.opinion?.reasoning) {
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(sanitize(wp.opinion.reasoning), CONTENT_W);
    for (const ln of lines) {
      ensureSpace(5);
      doc.text(ln, MARGIN, y + 4);
      y += 4.5;
    }
    y += 4;
  }

  // ── SECTION G: Sign-off ─────────────────────────────────────
  sectionHeader("SECTION G — AUDITOR SIGN-OFF");
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const declaration =
    "I have reviewed the above working papers and confirm that the audit has been conducted in accordance with Australian Auditing Standards and Standards on Assurance Engagements issued by the AUASB.";
  const decLines = doc.splitTextToSize(declaration, CONTENT_W);
  for (const ln of decLines) {
    ensureSpace(5);
    doc.text(ln, MARGIN, y + 4);
    y += 4.5;
  }
  y += 4;

  const signLine = (label: string) => {
    ensureSpace(10);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(label, MARGIN, y + 4);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN + 45, y + 5, MARGIN + CONTENT_W, y + 5);
    y += 9;
  };
  signLine("Name:");
  signLine("SMSF Auditor Number:");
  signLine("Firm:");
  signLine("Date:");
  signLine("Signature:");

  // ── Footer on every page ────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = PAGE_H - 8;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, fy - 4, PAGE_W - MARGIN, fy - 4);
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(sanitize(fund), MARGIN, fy);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, fy, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper JSON → plain text (used by PDF path)
// ─────────────────────────────────────────────────────────────────────────────

function workpaperJsonToPlainText(content: string): string {
  try {
    const raw = content.replace("__WORKPAPER_JSON__", "");
    const wp = JSON.parse(raw);
    const lines: string[] = [];

    lines.push("AUDIT WORKING PAPERS");
    lines.push(`Fund: ${wp.meta.fundName}`);
    lines.push(`ABN: ${wp.meta.fundABN}`);
    lines.push(`Financial Year: Year ended 30 June ${wp.meta.financialYear}`);
    lines.push(`Prepared: ${wp.meta.preparedDate}`);
    lines.push("");

    const addSection = (title: string, findings: any[]) => {
      lines.push("---------------------------------------------------");
      lines.push(title);
      lines.push("---------------------------------------------------");
      lines.push("");
      if (!findings.length) {
        lines.push("No findings recorded.");
        lines.push("");
        return;
      }
      for (const f of findings) {
        lines.push(f.area);
        lines.push(`Status: ${f.status.toUpperCase().replace(/_/g, " ")}`);
        lines.push(`Reference: ${f.reference || "N/A"}`);
        lines.push(`Confidence: ${f.confidence || "N/A"}`);
        lines.push("");
        lines.push("Procedure performed:");
        lines.push(f.detail);
        lines.push("");
        if (f.reviewAction) {
          lines.push(`Auditor review: ${f.reviewAction}${f.reviewNote ? " - " + f.reviewNote : ""}`);
          lines.push(`Reviewed by: ${f.reviewedBy || "N/A"} on ${f.reviewedAt || "N/A"}`);
        } else {
          lines.push("Auditor review: PENDING");
        }
        lines.push("");
      }
    };

    addSection("SECTION A - FINANCIAL AUDIT WORKING PAPERS", wp.partAFindings);
    addSection("SECTION B - COMPLIANCE ENGAGEMENT WORKING PAPERS", wp.partBFindings);

    lines.push("---------------------------------------------------");
    lines.push("SECTION C - DETERMINISTIC CHECKS");
    lines.push("---------------------------------------------------");
    lines.push(wp.deterministicBlock);
    lines.push("");

    lines.push("---------------------------------------------------");
    lines.push("SECTION D - CONTRAVENTIONS");
    lines.push("---------------------------------------------------");
    if (wp.contraventions.length) {
      wp.contraventions.forEach((c: any, i: number) => {
        lines.push(`${i + 1}. ${c.area}`);
        lines.push(`   SIS Section: ${c.section}`);
        lines.push(`   Severity: ${c.severity}`);
        lines.push(`   Details: ${c.description}`);
        lines.push("");
      });
    } else {
      lines.push("No contraventions identified.");
      lines.push("");
    }

    lines.push("---------------------------------------------------");
    lines.push("SECTION E - REQUESTS FOR INFORMATION");
    lines.push("---------------------------------------------------");
    if (wp.rfis.length) {
      wp.rfis.forEach((r: any, i: number) => {
        lines.push(`${i + 1}. [${r.priority}] ${r.title} - ${r.status}`);
        lines.push(`   ${r.description}`);
        lines.push("");
      });
    } else {
      lines.push("No RFIs raised.");
      lines.push("");
    }

    lines.push("---------------------------------------------------");
    lines.push("SECTION F - OPINION AND CONCLUSION");
    lines.push("---------------------------------------------------");
    lines.push(`Overall Opinion: ${wp.opinion.overall}`);
    lines.push("");
    lines.push(wp.opinion.reasoning);
    lines.push("");

    lines.push("---------------------------------------------------");
    lines.push("SECTION G - AUDITOR SIGN-OFF");
    lines.push("---------------------------------------------------");
    lines.push("I have reviewed the above working papers and confirm that the audit has been");
    lines.push("conducted in accordance with Australian Auditing Standards and Standards on");
    lines.push("Assurance Engagements issued by the AUASB.");
    lines.push("");
    lines.push("Auditor: ..........................................");
    lines.push("SMSF Auditor Number: ..................");
    lines.push("Date: ..........................................");
    lines.push("Signature: ..........................................");

    return lines.join("\n");
  } catch (_e) {
    return content.replace("__WORKPAPER_JSON__", "");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX Generation — routes to workpaper builder or generic builder
// ─────────────────────────────────────────────────────────────────────────────

export async function generateReportDocx(content: string, fileBaseName: string) {
  if (content.startsWith("__WORKPAPER_JSON__")) {
    await buildWorkpaperDocx(content, fileBaseName);
  } else {
    await buildGenericDocx(content, fileBaseName);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKPAPER DOCX — professional structured Word document
// ─────────────────────────────────────────────────────────────────────────────

// Colour palette — conservative, professional
const NAVY = "1C2B45";
const DGRAY = "333333";
const MGRAY = "666666";
const LGRAY = "F2F2F2";
const BGRAY = "E8E8E8";
const BORD = "CCCCCC";
const WHITE = "FFFFFF";
const GREEN = "1A5C35";
const GREENBG = "EAF2EC";
const ORANGE = "7B3F00";
const ORNBG = "FDF3E7";
const RED = "7B1111";
const REDBG = "FDF0F0";
const BLUE = "1A3A6B";
const BLUEBG = "EDF2FA";

// Status → colour mapping
function statusColor(status: string): { text: string; label: string; bg: string } {
  const s = status.toLowerCase();
  if (s === "pass") return { text: GREEN, label: "PASS", bg: GREENBG };
  if (s === "fail") return { text: RED, label: "FAIL", bg: REDBG };
  if (s === "needs_info") return { text: ORANGE, label: "INFO REQ", bg: ORNBG };
  if (s === "pass_with_review") return { text: ORANGE, label: "REVIEW", bg: ORNBG };
  if (s === "refer_to_auditor") return { text: BLUE, label: "REFER", bg: BLUEBG };
  return { text: MGRAY, label: "N/A", bg: LGRAY };
}

// Priority colour
function priorityColor(p: string): string {
  if (p === "HIGH") return RED;
  if (p === "MEDIUM") return ORANGE;
  return MGRAY;
}

// Border helper
const B = (color = BORD, sz = 4) => ({
  top: { style: BorderStyle.SINGLE, size: sz, color },
  bottom: { style: BorderStyle.SINGLE, size: sz, color },
  left: { style: BorderStyle.SINGLE, size: sz, color },
  right: { style: BorderStyle.SINGLE, size: sz, color },
});

const NB = () => ({
  top: { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left: { style: BorderStyle.NONE, size: 0, color: WHITE },
  right: { style: BorderStyle.NONE, size: 0, color: WHITE },
});

// Basic paragraph helpers
const p = (
  runs: any[],
  spacing: { before?: number; after?: number } = { before: 0, after: 80 },
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
) => new Paragraph({ children: runs, spacing, alignment: align });

const t = (text: string, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}) =>
  new TextRun({
    text,
    font: "Times New Roman",
    size: opts.size ?? 20,
    bold: opts.bold ?? false,
    color: opts.color ?? DGRAY,
    italics: opts.italic ?? false,
  });

const gap = (pt = 160) =>
  new Paragraph({ children: [new TextRun({ text: " ", size: 4 })], spacing: { before: 0, after: pt } });

const hRule = (color = BORD, sz = 6) =>
  new Paragraph({
    children: [],
    spacing: { before: 0, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: sz, color, space: 1 } },
  });

// Cell helper
const tc = (children: any, width: number, opts: any = {}) =>
  new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    borders: opts.bord ?? B(),
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: opts.m ?? { top: 80, bottom: 80, left: 140, right: 100 },
    verticalAlign: opts.va ?? VerticalAlign.TOP,
    columnSpan: opts.span ?? undefined,
  });

const tr = (cells: TableCell[]) => new TableRow({ children: cells });

// Section header bar — full-width navy with white title (matches PDF)
const sectionDiv = (_label: string, title: string) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      tr([
        tc([p([t(title.toUpperCase(), { bold: true, size: 22, color: WHITE })], { before: 0, after: 0 })], 9360, {
          bord: NB(),
          bg: NAVY,
          m: { top: 100, bottom: 100, left: 160, right: 120 },
          va: VerticalAlign.CENTER,
        }),
      ]),
    ],
  });

// Single finding block — bordered box w/ grey header strip, body, sign-off line (matches PDF)
function findingBlock(f: any, idx: number): (Table | Paragraph)[] {
  const st = statusColor(f.status);
  const rowShade = idx % 2 === 1 ? LGRAY : WHITE;

  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        // Header strip: area | reference | status
        tr([
          tc(
            [
              new Table({
                width: { size: 9100, type: WidthType.DXA },
                columnWidths: [4500, 2600, 2000],
                rows: [
                  tr([
                    tc(p([t(f.area || "—", { bold: true, size: 18, color: DGRAY })], { before: 0, after: 0 }), 4500, {
                      bord: NB(),
                      bg: BGRAY,
                      m: { top: 40, bottom: 40, left: 80, right: 40 },
                    }),
                    tc(
                      p([t(f.reference || "", { size: 18, color: DGRAY })], { before: 0, after: 0 }),
                      2600,
                      { bord: NB(), bg: BGRAY, m: { top: 40, bottom: 40, left: 40, right: 40 } },
                    ),
                    tc(
                      p(
                        [t(st.label, { bold: true, size: 18, color: st.text })],
                        { before: 0, after: 0 },
                        AlignmentType.RIGHT,
                      ),
                      2000,
                      { bord: NB(), bg: BGRAY, m: { top: 40, bottom: 40, left: 40, right: 80 } },
                    ),
                  ]),
                ],
              }),
            ],
            9360,
            { bord: NB(), bg: BGRAY, m: { top: 0, bottom: 0, left: 0, right: 0 } },
          ),
        ]),
        // Detail body
        tr([
          tc(
            [p([t(f.detail || f.description || "", { size: 18, color: DGRAY })], { before: 0, after: 60 })],
            9360,
            { bord: NB(), bg: rowShade, m: { top: 100, bottom: 60, left: 140, right: 140 } },
          ),
        ]),
        // Sign-off line at bottom
        tr([
          tc(
            [
              p(
                [t("Auditor sign-off: ______________________   Date: ______________", { size: 15, color: MGRAY })],
                { before: 0, after: 0 },
              ),
            ],
            9360,
            {
              bord: {
                top: { style: BorderStyle.SINGLE, size: 4, color: BORD },
                bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
                left: { style: BorderStyle.NONE, size: 0, color: WHITE },
                right: { style: BorderStyle.NONE, size: 0, color: WHITE },
              },
              bg: rowShade,
              m: { top: 60, bottom: 80, left: 140, right: 140 },
            },
          ),
        ]),
      ],
    }),
    gap(80),
  ];
}

async function buildWorkpaperDocx(content: string, fileBaseName: string) {
  const raw = content.replace("__WORKPAPER_JSON__", "");
  const wp = JSON.parse(raw);
  const meta = wp.meta || {};
  const opinion = wp.opinion || {};
  const partAFindings: any[] = wp.partAFindings || [];
  const partBFindings: any[] = wp.partBFindings || [];
  const deterministicBlock: string = wp.deterministicBlock || "";
  const contraventions: any[] = wp.contraventions || [];
  const rfis: any[] = wp.rfis || [];

  const opinionRaw = String(opinion.overall ?? "").toUpperCase();
  let opLabel = opinionRaw || "—";
  let opColor: string = DGRAY;
  if (/UNQUALIFIED|UNMODIFIED/.test(opinionRaw)) {
    opLabel = "UNQUALIFIED";
    opColor = GREEN;
  } else if (/ADVERSE|DISCLAIM/.test(opinionRaw)) {
    opColor = RED;
  } else if (/QUALIFIED|MODIFIED/.test(opinionRaw)) {
    opLabel = "QUALIFIED";
    opColor = ORANGE;
  }

  const children: any[] = [];

  // ── COVER BLOCK (full-width navy, matches PDF) ─────────────────────────────
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        tr([
          tc(
            [
              p(
                [t("AUDIT WORKING PAPERS", { bold: true, size: 40, color: WHITE })],
                { before: 0, after: 120 },
                AlignmentType.CENTER,
              ),
              p([t(meta.fundName || "", { size: 28, color: WHITE })], { before: 0, after: 80 }, AlignmentType.CENTER),
              p(
                [t(`Year ended 30 June ${meta.financialYear || ""}`, { size: 22, color: WHITE })],
                { before: 0, after: meta.fundABN ? 80 : 0 },
                AlignmentType.CENTER,
              ),
              ...(meta.fundABN
                ? [p([t(`ABN ${meta.fundABN}`, { size: 18, color: WHITE })], { before: 0, after: 0 }, AlignmentType.CENTER)]
                : []),
            ],
            9360,
            { bord: NB(), bg: NAVY, m: { top: 360, bottom: 360, left: 200, right: 200 } },
          ),
        ]),
      ],
    }),
  );
  children.push(gap(220));

  // ── SECTION A ──────────────────────────────────────────────────────────────
  children.push(sectionDiv("A", "Section A — Financial Audit Working Papers"));
  children.push(gap(100));
  if (partAFindings.length === 0) {
    children.push(p([t("No findings recorded.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }));
  } else {
    for (let i = 0; i < partAFindings.length; i++) children.push(...findingBlock(partAFindings[i], i));
  }

  // ── SECTION B ──────────────────────────────────────────────────────────────
  children.push(gap(140));
  children.push(sectionDiv("B", "Section B — Compliance Engagement Working Papers"));
  children.push(gap(100));
  if (partBFindings.length === 0) {
    children.push(p([t("No findings recorded.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }));
  } else {
    for (let i = 0; i < partBFindings.length; i++) children.push(...findingBlock(partBFindings[i], i));
  }

  // ── SECTION C — DETERMINISTIC CHECKS (only if present) ─────────────────────
  if (deterministicBlock && deterministicBlock.trim()) {
    children.push(gap(140));
    children.push(sectionDiv("C", "Section C — Deterministic Checks"));
    children.push(gap(100));
    for (const line of deterministicBlock.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(gap(40));
        continue;
      }
      const isBad = /BREACH|FAIL/.test(trimmed);
      children.push(
        p([t(trimmed, { size: 18, color: isBad ? RED : DGRAY, bold: /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed) })], {
          before: 0,
          after: 40,
        }),
      );
    }
  }

  // ── SECTION D — CONTRAVENTIONS ────────────────────────────────────────────
  children.push(gap(140));
  children.push(sectionDiv("D", "Section D — Contraventions"));
  children.push(gap(100));

  if (contraventions.length === 0) {
    children.push(
      p([t("No contraventions identified.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }),
    );
  } else {
    const colW = [2000, 1600, 1400, 4360];
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: colW,
        rows: [
          tr(
            ["Area", "SIS Section", "Severity", "Details"].map((h, i) =>
              tc(p([t(h, { bold: true, size: 18, color: WHITE })], { before: 0, after: 0 }), colW[i], {
                bord: B(NAVY),
                bg: NAVY,
                m: { top: 80, bottom: 80, left: 100, right: 80 },
              }),
            ),
          ),
          ...contraventions.map((c: any, i: number) => {
            const bg = i % 2 === 1 ? LGRAY : WHITE;
            const sev = String(c.severity ?? "").toLowerCase();
            const sevColor = sev === "material" ? RED : ORANGE;
            return tr([
              tc(p([t(c.area || "—", { size: 17 })], { before: 0, after: 0 }), colW[0], { bg }),
              tc(p([t(c.section || "—", { size: 17, bold: true, color: NAVY })], { before: 0, after: 0 }), colW[1], { bg }),
              tc(
                p([t(String(c.severity ?? "—").toUpperCase(), { bold: true, size: 17, color: sevColor })], {
                  before: 0,
                  after: 0,
                }),
                colW[2],
                { bg },
              ),
              tc(p([t(c.description || "—", { size: 17 })], { before: 0, after: 0 }), colW[3], { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── SECTION E — RFIs ──────────────────────────────────────────────────────
  children.push(gap(140));
  children.push(sectionDiv("E", "Section E — Requests for Information"));
  children.push(gap(100));

  if (rfis.length === 0) {
    children.push(p([t("No RFIs raised.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }));
  } else {
    const rcolW = [1100, 2200, 4860, 1200];
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: rcolW,
        rows: [
          tr(
            ["Priority", "Title", "Description", "Status"].map((h, i) =>
              tc(p([t(h, { bold: true, size: 18, color: WHITE })], { before: 0, after: 0 }), rcolW[i], {
                bord: B(NAVY),
                bg: NAVY,
                m: { top: 80, bottom: 80, left: 100, right: 80 },
              }),
            ),
          ),
          ...rfis.map((r: any, i: number) => {
            const bg = i % 2 === 1 ? LGRAY : WHITE;
            const pc = priorityColor(String(r.priority ?? "").toUpperCase());
            const stat = String(r.status ?? "");
            return tr([
              tc(
                p([t(String(r.priority ?? "—"), { bold: true, size: 17, color: pc })], { before: 0, after: 0 }),
                rcolW[0],
                { bg },
              ),
              tc(
                p([t(r.title || "—", { bold: true, size: 17, color: NAVY })], { before: 0, after: 0 }),
                rcolW[1],
                { bg },
              ),
              tc(p([t(r.description || "—", { size: 17 })], { before: 0, after: 0 }), rcolW[2], { bg }),
              tc(
                p(
                  [t(stat || "—", { bold: true, size: 17, color: stat.toUpperCase() === "RESOLVED" ? GREEN : ORANGE })],
                  { before: 0, after: 0 },
                ),
                rcolW[3],
                { bg },
              ),
            ]);
          }),
        ],
      }),
    );
  }

  // ── SECTION F — OPINION ───────────────────────────────────────────────────
  children.push(gap(160));
  children.push(sectionDiv("F", "Section F — Opinion and Conclusion"));
  children.push(gap(120));
  children.push(p([t(opLabel, { bold: true, size: 36, color: opColor })], { before: 0, after: 120 }));
  if (opinion.reasoning) {
    children.push(p([t(String(opinion.reasoning), { size: 18, color: DGRAY })], { before: 0, after: 0 }));
  }

  // ── SECTION G — SIGN-OFF ──────────────────────────────────────────────────
  children.push(gap(180));
  children.push(sectionDiv("G", "Section G — Auditor Sign-Off"));
  children.push(gap(120));
  children.push(
    p(
      [
        t(
          "I have reviewed the above working papers and confirm that the audit has been conducted in accordance with Australian Auditing Standards and Standards on Assurance Engagements issued by the AUASB.",
          { size: 18, color: DGRAY },
        ),
      ],
      { before: 0, after: 160 },
    ),
  );
  for (const label of ["Name:", "SMSF Auditor Number:", "Firm:", "Date:", "Signature:"]) {
    children.push(
      new Paragraph({
        spacing: { before: 0, after: 140 },
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORD, space: 4 } },
        children: [t(label, { size: 18, color: DGRAY }), new TextRun({ text: "\t", size: 18 })],
      }),
    );
  }

  // ── BUILD DOCUMENT ─────────────────────────────────────────────────────────
  const docx = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 20, color: DGRAY } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 480, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 portrait
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              hRule(BORD, 4),
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                children: [
                  t(meta.fundName || "", { size: 14, color: MGRAY }),
                  new TextRun({ text: "\t", size: 14 }),
                  new TextRun({
                    children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                    size: 14,
                    color: MGRAY,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(docx);
  saveAs(buffer, `${fileBaseName}.docx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic DOCX builder — for all other reports (IAR, management letter, etc.)
// ─────────────────────────────────────────────────────────────────────────────

async function buildGenericDocx(content: string, fileBaseName: string) {
  const lines = content.split("\n");
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      i++;
      continue;
    }

    // Divider lines
    if (/^[-]{3,}$/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [],
          spacing: { before: 0, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORD, space: 1 } },
        }),
      );
      i++;
      continue;
    }

    // Section headings (ALL CAPS)
    const isHeading =
      trimmed.length >= 4 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !trimmed.includes("|") &&
      trimmed.length < 80;
    if (isHeading) {
      children.push(
        new Paragraph({
          spacing: { before: 280, after: 120 },
          children: [new TextRun({ text: trimmed, bold: true, font: "Times New Roman", size: 22, color: NAVY })],
        }),
      );
      i++;
      continue;
    }

    // Table rows (pipe-separated)
    if (trimmed.includes("|") && trimmed.split("|").length >= 3) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim().split("|").length >= 3) {
        tableRows.push(lines[i].trim());
        i++;
      }
      const parsed = tableRows
        .filter((r) => !r.match(/^[\-|=\s]+$/))
        .map((r) =>
          r
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean),
        );
      if (parsed.length > 0) {
        const colCount = Math.max(...parsed.map((r) => r.length));
        const colWidth = Math.floor(9360 / colCount);
        children.push(
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: Array(colCount).fill(colWidth),
            rows: parsed.map(
              (cells, ri) =>
                new TableRow({
                  children: Array.from(
                    { length: colCount },
                    (_, ci) =>
                      new TableCell({
                        borders: B(),
                        width: { size: colWidth, type: WidthType.DXA },
                        shading: ri === 0 ? { fill: NAVY, type: ShadingType.CLEAR } : undefined,
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: cells[ci] || "",
                                bold: ri === 0,
                                color: ri === 0 ? WHITE : DGRAY,
                                font: "Times New Roman",
                                size: 19,
                              }),
                            ],
                          }),
                        ],
                      }),
                  ),
                }),
            ),
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    // Normal body text
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: raw, font: "Times New Roman", size: 20, color: DGRAY })],
      }),
    );
    i++;
  }

  const docx = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 20, color: DGRAY } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(docx);
  saveAs(buffer, `${fileBaseName}.docx`);
}
