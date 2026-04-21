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
  Header,
  Footer,
} from "docx";
import { saveAs } from "file-saver";

// ─────────────────────────────────────────────────────────────────────────────
// Shared colour palette (used by both PDF and DOCX)
// ─────────────────────────────────────────────────────────────────────────────

// PDF colours as [R,G,B]
const PDF_NAVY: [number, number, number] = [28, 43, 69];
const PDF_DGRAY: [number, number, number] = [51, 51, 51];
const PDF_MGRAY: [number, number, number] = [102, 102, 102];
const PDF_LGRAY: [number, number, number] = [242, 242, 242];
const PDF_BGRAY: [number, number, number] = [232, 232, 232];
const PDF_BORDER: [number, number, number] = [204, 204, 204];
const PDF_WHITE: [number, number, number] = [255, 255, 255];
const PDF_GREEN: [number, number, number] = [26, 92, 53];
const PDF_GREEN_BG: [number, number, number] = [234, 242, 236];
const PDF_ORANGE: [number, number, number] = [123, 63, 0];
const PDF_ORN_BG: [number, number, number] = [253, 243, 231];
const PDF_RED: [number, number, number] = [123, 17, 17];
const PDF_RED_BG: [number, number, number] = [253, 240, 240];
const PDF_BLUE: [number, number, number] = [26, 58, 107];
const PDF_BLUE_BG: [number, number, number] = [237, 242, 250];

// DOCX colours as hex strings
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared status helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusColorDocx(status: string): { text: string; label: string; bg: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "pass") return { text: GREEN, label: "PASS", bg: GREENBG };
  if (s === "fail") return { text: RED, label: "FAIL", bg: REDBG };
  if (s === "needs_info") return { text: ORANGE, label: "INFO REQ", bg: ORNBG };
  if (s === "pass_with_review") return { text: ORANGE, label: "REVIEW", bg: ORNBG };
  if (s === "refer_to_auditor") return { text: BLUE, label: "REFER", bg: BLUEBG };
  return { text: MGRAY, label: "N/A", bg: LGRAY };
}

function statusColorPdf(status: string): {
  text: [number, number, number];
  label: string;
  bg: [number, number, number];
} {
  const s = (status ?? "").toLowerCase();
  if (s === "pass") return { text: PDF_GREEN, label: "PASS", bg: PDF_GREEN_BG };
  if (s === "fail") return { text: PDF_RED, label: "FAIL", bg: PDF_RED_BG };
  if (s === "needs_info") return { text: PDF_ORANGE, label: "INFO REQ", bg: PDF_ORN_BG };
  if (s === "pass_with_review") return { text: PDF_ORANGE, label: "REVIEW", bg: PDF_ORN_BG };
  if (s === "refer_to_auditor") return { text: PDF_BLUE, label: "REFER", bg: PDF_BLUE_BG };
  return { text: PDF_MGRAY, label: "N/A", bg: PDF_LGRAY };
}

function opinionColorDocx(overall: string): { text: string; bg: string } {
  const o = (overall ?? "").toLowerCase();
  if (/unqualified|unmodified/.test(o)) return { text: GREEN, bg: GREENBG };
  if (/adverse|disclaim/.test(o)) return { text: RED, bg: REDBG };
  if (/qualified|modified/.test(o)) return { text: ORANGE, bg: ORNBG };
  return { text: DGRAY, bg: LGRAY };
}

function opinionColorPdf(overall: string): {
  text: [number, number, number];
  bg: [number, number, number];
} {
  const o = (overall ?? "").toLowerCase();
  if (/unqualified|unmodified/.test(o)) return { text: PDF_GREEN, bg: PDF_GREEN_BG };
  if (/adverse|disclaim/.test(o)) return { text: PDF_RED, bg: PDF_RED_BG };
  if (/qualified|modified/.test(o)) return { text: PDF_ORANGE, bg: PDF_ORN_BG };
  return { text: PDF_DGRAY, bg: PDF_LGRAY };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation — routes to workpaper builder or generic builder
// ─────────────────────────────────────────────────────────────────────────────

export function generateReportPdf(content: string, fundName: string, financialYear: string, fileBaseName: string) {
  if (content.startsWith("__WORKPAPER_JSON__")) {
    buildWorkpaperPdf(content, fundName, financialYear, fileBaseName);
  } else {
    buildGenericPdf(content, fundName, fileBaseName);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper PDF — mirrors the DOCX structure section-for-section
// ─────────────────────────────────────────────────────────────────────────────

function buildWorkpaperPdf(content: string, fundName: string, financialYear: string, fileBaseName: string) {
  let wp: any;
  try {
    wp = JSON.parse(content.replace("__WORKPAPER_JSON__", ""));
  } catch {
    buildGenericPdf(content.replace("__WORKPAPER_JSON__", ""), fundName, fileBaseName);
    return;
  }

  const meta = wp.meta ?? {};
  const opinion = wp.opinion ?? {};
  const partAFindings = wp.partAFindings ?? [];
  const partBFindings = wp.partBFindings ?? [];
  const deterministicBlock = wp.deterministicBlock ?? "";
  const contraventions = wp.contraventions ?? [];
  const rfis = wp.rfis ?? [];

  const fund = meta.fundName || fundName;
  const year = meta.financialYear || financialYear;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 15; // left margin
  const MR = 15; // right margin
  const CW = PW - ML - MR; // content width
  const FOOT = 16; // footer reserve from bottom

  let y = ML;

  const san = (s: any) => String(s ?? "").replace(/[^\x00-\x7E]/g, "");

  // ── ensure space ────────────────────────────────────────────────────────────
  const need = (h: number) => {
    if (y + h > PH - FOOT) {
      addFooter();
      doc.addPage();
      y = ML;
    }
  };

  // ── draw footer on current page ─────────────────────────────────────────────
  const addFooter = () => {
    const pg = doc.getCurrentPageInfo().pageNumber;
    const fy = PH - 8;
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, fy - 4, PW - MR, fy - 4);
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_MGRAY);
    doc.text(san(fund), ML, fy);
    // page count added at end
  };

  // ── section divider bar (mirrors DOCX sectionDiv) ───────────────────────────
  const sectionDiv = (label: string, title: string) => {
    need(10);
    // label box
    doc.setFillColor(...PDF_NAVY);
    doc.rect(ML, y, 14, 8, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_WHITE);
    doc.text(san(label), ML + 7, y + 5.5, { align: "center" });
    // title box
    doc.setFillColor(46, 68, 112); // "2E4470"
    doc.rect(ML + 14, y, CW - 14, 8, "F");
    doc.setFontSize(11);
    doc.text(san(title), ML + 18, y + 5.5);
    y += 11;
  };

  // ── helper: body text ────────────────────────────────────────────────────────
  const bodyText = (
    text: string,
    opts: {
      bold?: boolean;
      italic?: boolean;
      size?: number;
      color?: [number, number, number];
      indent?: number;
    } = {},
  ) => {
    const sz = opts.size ?? 9;
    const color = opts.color ?? PDF_DGRAY;
    const indent = opts.indent ?? 0;
    doc.setFont("times", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
    doc.setFontSize(sz);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(san(text), CW - indent);
    for (const ln of lines) {
      need(sz * 0.4 + 1);
      doc.text(ln, ML + indent, y);
      y += sz * 0.42 + 0.5;
    }
  };

  // ── helper: labelled field row ───────────────────────────────────────────────
  const labelField = (label: string, value: string) => {
    need(5);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_DGRAY);
    doc.text(san(label), ML + 2, y);
    doc.setFont("times", "normal");
    doc.text(san(value), ML + 42, y);
    y += 5;
  };

  // ── helper: horizontal rule ──────────────────────────────────────────────────
  const hRule = (color = PDF_BORDER) => {
    need(3);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(ML, y, ML + CW, y);
    y += 3;
  };

  // ── helper: gap ──────────────────────────────────────────────────────────────
  const gap = (mm = 4) => {
    y += mm;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // COVER
  // ─────────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, 0, PW, 60, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PDF_WHITE);
  doc.text("AUDIT WORKING PAPERS", PW / 2, 22, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text(san(fund), PW / 2, 36, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Year ended 30 June ${san(year)}`, PW / 2, 46, { align: "center" });
  if (meta.fundABN) {
    doc.setFontSize(8);
    doc.text(`ABN ${san(meta.fundABN)}`, PW / 2, 54, { align: "center" });
  }
  y = 68;

  // Cover detail boxes — Fund Details | Opinion Summary (2-col)
  const halfW = CW / 2 - 2;
  const boxTop = y;
  const opCol = opinionColorPdf(opinion.overall ?? "");

  // Fund details box
  doc.setFillColor(...PDF_BLUE_BG);
  // height will be computed dynamically — just draw text first, measure, then rect
  const fundLines = [
    { label: "ABN:", value: san(meta.fundABN ?? "N/A") },
    { label: "Financial Year:", value: `Year ended 30 June ${san(year)}` },
    { label: "Prepared:", value: san(meta.preparedDate ?? "N/A") },
    { label: "Audit Standard:", value: "ASAE 3100 / SISA / SISR" },
  ];
  const boxH = 8 + fundLines.length * 5.5 + 4;
  doc.setFillColor(...PDF_BLUE_BG);
  doc.rect(ML, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, boxTop, halfW, boxH);

  // Opinion box
  doc.setFillColor(...opCol.bg);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...opCol.text);
  doc.setLineWidth(0.4);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH);

  // Fund details text
  let bx = ML + 2;
  let by = boxTop + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Fund Details", bx, by);
  by += 5;
  for (const fl of fundLines) {
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_DGRAY);
    doc.text(fl.label, bx, by);
    doc.setFont("times", "normal");
    doc.text(fl.value, bx + 30, by);
    by += 5.2;
  }

  // Opinion text
  bx = ML + halfW + 6;
  by = boxTop + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Audit Opinion Summary", bx, by);
  by += 5;
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...opCol.text);
  const opLabel = (opinion.overall ?? "PENDING").toUpperCase();
  doc.text(`Overall: ${opLabel}`, bx, by);
  by += 5;
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  // Full reasoning text — no truncation
  const reasoningSnippetLines = doc.splitTextToSize(san(opinion.reasoning ?? "Opinion pending."), halfW - 6);
  for (const rl of reasoningSnippetLines) {
    if (by > boxTop + boxH - 1) break; // clip to box height
    doc.text(rl, bx, by);
    by += 4;
  }

  y = boxTop + boxH + 6;

  // ─────────────────────────────────────────────────────────────────────────────
  // PART A
  // ─────────────────────────────────────────────────────────────────────────────
  addFooter();
  doc.addPage();
  y = ML;

  sectionDiv("A", "Part A — Financial Audit Working Papers");
  gap(3);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  doc.text("Objective:", ML, y);
  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_MGRAY);
  doc.text(
    "  Obtain sufficient appropriate audit evidence to support the opinion on the financial statements (ASAE 3100, ASA 500).",
    ML + 20,
    y,
  );
  y += 5;
  gap(3);

  if (partAFindings.length === 0) {
    bodyText("No Part A findings recorded.", { italic: true, color: PDF_MGRAY });
  } else {
    partAFindings.forEach((f: any, i: number) => renderFindingPdf(doc, f, i, ML, CW, PH, FOOT, san, gap, need));
    y = (doc as any).__lastY ?? y; // sync y after finding renders
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PART B
  // ─────────────────────────────────────────────────────────────────────────────
  addFooter();
  doc.addPage();
  y = ML;

  sectionDiv("B", "Part B — Compliance Engagement Working Papers");
  gap(3);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  doc.text("Objective:", ML, y);
  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_MGRAY);
  doc.text(
    "  Assess compliance with the provisions of the SISA and SISR specified in NAT 11466 (ASAE 3100, GS 009).",
    ML + 20,
    y,
  );
  y += 5;
  gap(3);

  if (partBFindings.length === 0) {
    bodyText("No Part B findings recorded.", { italic: true, color: PDF_MGRAY });
  } else {
    partBFindings.forEach((f: any, i: number) => renderFindingPdf(doc, f, i, ML, CW, PH, FOOT, san, gap, need));
    y = (doc as any).__lastY ?? y;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION C — Deterministic Checks
  // ─────────────────────────────────────────────────────────────────────────────
  addFooter();
  doc.addPage();
  y = ML;

  sectionDiv("C", "Deterministic Checks — Code Verified");
  gap(3);
  bodyText(
    "The following results were computed arithmetically and are authoritative. Do not override with AI assessment.",
    { italic: true, color: PDF_MGRAY, size: 8 },
  );
  gap(3);

  for (const line of deterministicBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      gap(2);
      continue;
    }
    const isBold = /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed);
    const isBad = /BREACH|FAIL/.test(trimmed);
    bodyText(trimmed, {
      bold: isBold,
      size: 8.5,
      color: isBad ? PDF_RED : PDF_DGRAY,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION D — Contraventions
  // ─────────────────────────────────────────────────────────────────────────────
  gap(6);
  sectionDiv("D", "Contraventions Register");
  gap(3);

  if (contraventions.length === 0) {
    bodyText("No contraventions identified.", { italic: true, color: PDF_GREEN });
  } else {
    // Table header
    const dCols = [
      { label: "#", w: 0.05 },
      { label: "SIS Section", w: 0.15 },
      { label: "Area", w: 0.2 },
      { label: "Severity", w: 0.12 },
      { label: "Details", w: 0.48 },
    ];
    drawTableHeader(doc, ML, CW, y, dCols);
    y += 6;

    contraventions.forEach((c: any, i: number) => {
      const bg = i % 2 === 0 ? PDF_WHITE : PDF_LGRAY;
      const sevColor = c.severity === "material" ? PDF_RED : PDF_ORANGE;
      const cells = [
        { text: String(i + 1), bold: true },
        { text: san(c.section), bold: true, color: PDF_NAVY },
        { text: san(c.area) },
        { text: (c.severity ?? "").toUpperCase(), bold: true, color: sevColor },
        { text: san(c.description) },
      ];
      y = drawTableRow(doc, ML, CW, y, dCols, cells, bg, PH, FOOT);
    });
    gap(4);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION E — RFIs
  // ─────────────────────────────────────────────────────────────────────────────
  gap(6);
  sectionDiv("E", "Requests for Information (RFIs)");
  gap(3);

  if (rfis.length === 0) {
    bodyText("No RFIs raised.", { italic: true, color: PDF_GREEN });
  } else {
    const eCols = [
      { label: "#", w: 0.05 },
      { label: "Priority", w: 0.1 },
      { label: "Request", w: 0.52 },
      { label: "Title", w: 0.2 },
      { label: "Status", w: 0.13 },
    ];
    drawTableHeader(doc, ML, CW, y, eCols);
    y += 6;

    rfis.forEach((r: any, i: number) => {
      const bg = i % 2 === 0 ? PDF_WHITE : PDF_LGRAY;
      const pc = r.priority === "HIGH" ? PDF_RED : r.priority === "MEDIUM" ? PDF_ORANGE : PDF_MGRAY;
      const stCol = r.status === "RESOLVED" ? PDF_GREEN : PDF_ORANGE;
      const cells = [
        { text: String(i + 1), bold: true },
        { text: san(r.priority), bold: true, color: pc },
        { text: san(r.description) },
        { text: san(r.title), bold: true, color: PDF_NAVY },
        { text: san(r.status), bold: true, color: stCol },
      ];
      y = drawTableRow(doc, ML, CW, y, eCols, cells, bg, PH, FOOT);
    });
    gap(4);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION F — Opinion
  // ─────────────────────────────────────────────────────────────────────────────
  addFooter();
  doc.addPage();
  y = ML;

  sectionDiv("F", "Audit Opinion");
  gap(4);

  const opC = opinionColorPdf(opinion.overall ?? "");
  const opTxt = (opinion.overall ?? "PENDING").toUpperCase();

  // Opinion box — full reasoning, no truncation
  const reasoningLines = doc.splitTextToSize(san(opinion.reasoning ?? "Opinion reasoning pending."), CW - 6);
  const opBoxH = 16 + reasoningLines.length * 4.5;
  need(opBoxH);

  doc.setFillColor(...opC.bg);
  doc.rect(ML, y, CW, opBoxH, "F");
  doc.setDrawColor(...opC.text);
  doc.setLineWidth(0.5);
  doc.rect(ML, y, CW, opBoxH);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...opC.text);
  doc.text(`Overall Opinion:  ${opTxt}`, ML + 3, y + 9);

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  let oy = y + 15;
  for (const rl of reasoningLines) {
    doc.text(rl, ML + 3, oy);
    oy += 4.5;
  }
  y = oy + 4;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION G — Auditor Sign-Off
  // ─────────────────────────────────────────────────────────────────────────────
  addFooter();
  doc.addPage();
  y = ML;

  sectionDiv("G", "Auditor Sign-Off");
  gap(4);

  const checklist = [
    "reviewed all working papers contained in this file",
    "obtained sufficient appropriate audit evidence",
    "conducted this audit in accordance with ASAE 3100",
    "complied with independence requirements under APES 110",
    "identified and assessed all contraventions as documented",
    "formed the opinion expressed in Section F",
  ];
  const decItems = checklist.length;
  const leftW = CW / 2 - 2;
  const rightW = CW / 2 - 2;
  const signRows = ["Name:", "SMSF Auditor Number:", "Firm:", "Date:", "Signature:"];
  const leftH = 10 + decItems * 5 + signRows.length * 7 + 10;
  const retLines = doc.splitTextToSize(
    "These working papers must be retained for a minimum of 7 years from the date of signing, in accordance with ASIC requirements and ASA 230.",
    rightW - 6,
  );
  const bodyLine2 = doc.splitTextToSize(
    "An experienced auditor with no prior connection to this engagement should be able to understand, from these working papers alone, the nature, timing and extent of the audit procedures performed, the audit evidence obtained and the conclusions reached.",
    rightW - 6,
  );
  const rightH = 10 + retLines.length * 4.2 + 6 + bodyLine2.length * 4.2 + 6;
  const soBoxH = Math.max(leftH, rightH);
  need(soBoxH);

  // Left (blue)
  doc.setFillColor(...PDF_BLUE_BG);
  doc.rect(ML, y, leftW, soBoxH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, leftW, soBoxH);

  // Right (grey)
  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML + leftW + 4, y, rightW, soBoxH, "F");
  doc.rect(ML + leftW + 4, y, rightW, soBoxH);

  // Left content
  let lx = ML + 3;
  let ly = y + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Auditor Declaration", lx, ly);
  ly += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  doc.text("I confirm that I have:", lx, ly);
  ly += 5;
  for (const item of checklist) {
    doc.text(`-  ${san(item)}`, lx + 3, ly);
    ly += 4.8;
  }
  ly += 3;
  for (const row of signRows) {
    doc.text(row, lx, ly);
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.25);
    doc.line(lx + 38, ly + 1, ML + leftW - 3, ly + 1);
    ly += 7;
  }

  // Right content
  let rx = ML + leftW + 7;
  let ry = y + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Retention Notice", rx, ry);
  ry += 5;
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  for (const rl of retLines) {
    doc.text(rl, rx, ry);
    ry += 4.2;
  }
  ry += 3;
  doc.setFont("times", "normal");
  for (const bl of bodyLine2) {
    doc.text(bl, rx, ry);
    ry += 4.2;
  }

  y += soBoxH + 6;

  // ── Stamp footers + page numbers on every page ───────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg);
    const fy = PH - 8;
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, fy - 4, PW - MR, fy - 4);
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_MGRAY);
    doc.text(san(fund), ML, fy);
    doc.text(`Page ${pg} of ${pageCount}`, PW - MR, fy, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding card renderer (PDF) — mirrors DOCX findingBlock exactly
// ─────────────────────────────────────────────────────────────────────────────

function renderFindingPdf(
  doc: jsPDF,
  f: any,
  idx: number,
  ML: number,
  CW: number,
  PH: number,
  FOOT: number,
  san: (s: any) => string,
  gap: (mm?: number) => void,
  need: (h: number) => void,
) {
  const st = statusColorPdf(f.status);
  const shade = idx % 2 === 0 ? PDF_WHITE : PDF_LGRAY;

  // ── Row 1: area | reference | confidence | result ──────────────────────────
  need(30);
  const r1H = 14;
  const r1y = (doc as any).__currentY ?? ML;
  // We'll use doc.getCurrentPageInfo to track y across pages — keep local y tracking
  // Since we can't pass y in/out cleanly here, track via a closure var stored on doc
  let ly: number = (doc as any).__lastY ?? ML;

  // Row 1 background
  doc.setFillColor(...shade);
  doc.rect(ML, ly, CW, r1H, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, ly, CW, r1H);

  // Area name
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(san(f.area), ML + 2, ly + 5);

  // Reference col
  const refX = ML + CW * 0.42;
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("SIS Reference", refX, ly + 4);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(san(f.reference ?? "N/A"), refX, ly + 8.5);

  // Confidence col
  const confX = ML + CW * 0.57;
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Confidence", confX, ly + 4);
  const confVal = (f.confidence ?? "N/A").toUpperCase();
  const confColor = f.confidence === "high" ? PDF_GREEN : f.confidence === "medium" ? PDF_ORANGE : PDF_MGRAY;
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...confColor);
  doc.text(confVal, confX, ly + 8.5);

  // Result col
  const resX = ML + CW * 0.75;
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Result", resX, ly + 4);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...st.text);
  doc.text(st.label, resX, ly + 8.5);

  ly += r1H;

  // ── Row 2: procedure (full, no truncation) + sign-off box ─────────────────
  const procedureText = san(f.detail ?? "");
  const signOffW = CW * 0.25;
  const procW = CW - signOffW;
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  const procLines = doc.splitTextToSize(procedureText, procW - 6);
  const r2H = Math.max(procLines.length * 4 + 10, 22);

  // check page
  if (ly + r2H > doc.internal.pageSize.getHeight() - FOOT) {
    doc.addPage();
    ly = ML;
  }

  // procedure box
  doc.setFillColor(...PDF_WHITE);
  doc.rect(ML, ly, procW, r2H, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, ly, procW, r2H);
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Procedure Performed", ML + 2, ly + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_DGRAY);
  let py = ly + 9;
  for (const pl of procLines) {
    doc.text(pl, ML + 2, py);
    py += 4;
  }

  // sign-off box
  doc.setFillColor(...PDF_WHITE);
  doc.rect(ML + procW, ly, signOffW, r2H, "F");
  doc.rect(ML + procW, ly, signOffW, r2H);
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Auditor Sign-Off", ML + procW + 2, ly + 4.5);
  doc.setFontSize(8);
  doc.text("Initials: ________", ML + procW + 2, ly + 10);
  doc.text("Date:        ________", ML + procW + 2, ly + 15);

  ly += r2H;

  // ── Row 3: conclusion (full text) ─────────────────────────────────────────
  const conclusionText = f.reviewAction
    ? `${f.reviewAction.toUpperCase()}${f.reviewNote ? " — " + f.reviewNote : ""}`
    : "Pending auditor review.";

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  const concLines = doc.splitTextToSize(`Conclusion:  ${san(conclusionText)}`, CW - 6);
  const r3H = concLines.length * 4 + 6;

  if (ly + r3H > doc.internal.pageSize.getHeight() - FOOT) {
    doc.addPage();
    ly = ML;
  }

  doc.setFillColor(...st.bg);
  doc.rect(ML, ly, CW, r3H, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, ly, CW, r3H);

  let cy = ly + 4.5;
  for (let ci = 0; ci < concLines.length; ci++) {
    if (ci === 0) {
      // Bold "Conclusion:" prefix
      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_MGRAY);
      doc.text("Conclusion:", ML + 2, cy);
      doc.setFont("times", !f.reviewAction ? "italic" : "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_DGRAY);
      const prefixW = doc.getTextWidth("Conclusion:  ");
      doc.text(concLines[0].replace("Conclusion:  ", ""), ML + 2 + prefixW, cy);
    } else {
      doc.setFont("times", !f.reviewAction ? "italic" : "normal");
      doc.setTextColor(...PDF_DGRAY);
      doc.text(concLines[ci], ML + 2, cy);
    }
    cy += 4;
  }

  ly += r3H + 3;

  // Store for next call
  (doc as any).__lastY = ly;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table helpers for PDF
// ─────────────────────────────────────────────────────────────────────────────

type ColDef = { label: string; w: number };

function drawTableHeader(doc: jsPDF, ML: number, CW: number, y: number, cols: ColDef[]) {
  doc.setFillColor(...PDF_NAVY);
  doc.rect(ML, y, CW, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_WHITE);
  let cx = ML + 1;
  for (const col of cols) {
    const w = col.w * CW;
    doc.text(col.label, cx, y + 4.2);
    cx += w;
  }
}

function drawTableRow(
  doc: jsPDF,
  ML: number,
  CW: number,
  y: number,
  cols: ColDef[],
  cells: Array<{ text: string; bold?: boolean; color?: [number, number, number] }>,
  bg: [number, number, number],
  PH: number,
  FOOT: number,
): number {
  const colWidths = cols.map((c) => c.w * CW);
  // pre-wrap all cells to find row height
  const wrapped = cells.map((cell, i) => {
    doc.setFont("times", cell.bold ? "bold" : "normal");
    doc.setFontSize(8);
    return doc.splitTextToSize(cell.text, colWidths[i] - 3);
  });
  const maxLines = Math.max(...wrapped.map((w) => w.length));
  const rowH = maxLines * 4.2 + 4;

  if (y + rowH > PH - FOOT) {
    doc.addPage();
    y = ML;
    // re-draw header
    drawTableHeader(doc, ML, CW, y, cols);
    y += 6;
  }

  doc.setFillColor(...bg);
  doc.rect(ML, y, CW, rowH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.15);
  doc.rect(ML, y, CW, rowH);

  let cx = ML + 1;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const color = cell.color ?? PDF_DGRAY;
    doc.setFont("times", cell.bold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(...color);
    let ty = y + 4;
    for (const ln of wrapped[i]) {
      doc.text(ln, cx, ty);
      ty += 4.2;
    }
    cx += colWidths[i];
  }

  return y + rowH;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic PDF — plain text reports (IAR, management letter, etc.)
// ─────────────────────────────────────────────────────────────────────────────

function buildGenericPdf(content: string, fundName: string, fileBaseName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight() - margin * 2;
  const lines = content.split("\n");
  let y = margin;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 4;
      if (y > pageH + margin) {
        doc.addPage();
        y = margin;
      }
      continue;
    }
    if (/^[-]{3,}$/.test(trimmed)) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + pageW, y);
      y += 5;
      if (y > pageH + margin) {
        doc.addPage();
        y = margin;
      }
      continue;
    }
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
      const wrapped = doc.splitTextToSize(trimmed, pageW);
      for (const wl of wrapped) {
        if (y > pageH + margin) {
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
    const wrapped = doc.splitTextToSize(sanitized, pageW);
    for (const wl of wrapped) {
      if (y > pageH + margin) {
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
// DOCX helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  new Paragraph({
    children: [new TextRun({ text: " ", size: 4 })],
    spacing: { before: 0, after: pt },
  });

const hRule = (color = BORD, sz = 6) =>
  new Paragraph({
    children: [],
    spacing: { before: 0, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: sz, color, space: 1 } },
  });

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

const sectionDiv = (label: string, title: string) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [480, 8880],
    rows: [
      tr([
        tc(p([t(label, { bold: true, size: 20, color: WHITE })], { before: 0, after: 0 }, AlignmentType.CENTER), 480, {
          bord: NB(),
          bg: NAVY,
          m: { top: 100, bottom: 100, left: 60, right: 60 },
          va: VerticalAlign.CENTER,
        }),
        tc([p([t(title, { bold: true, size: 21, color: WHITE })], { before: 0, after: 0 })], 8880, {
          bord: NB(),
          bg: "2E4470",
          m: { top: 100, bottom: 100, left: 180, right: 100 },
        }),
      ]),
    ],
  });

// Finding block — full text, no truncation anywhere
function findingBlock(f: any, idx: number): (Table | Paragraph)[] {
  const st = statusColorDocx(f.status);
  const shade = idx % 2 === 0 ? WHITE : LGRAY;

  const conclusionText = f.reviewAction
    ? `${f.reviewAction.toUpperCase()}${f.reviewNote ? " — " + f.reviewNote : ""}`
    : "Pending auditor review.";

  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3800, 1400, 1400, 2760],
      rows: [
        // Row 1: area | reference | confidence | status
        tr([
          tc([p([t(f.area, { bold: true, size: 20, color: NAVY })], { before: 0, after: 20 })], 3800, { bg: shade }),
          tc(
            [
              p([t("SIS Reference", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t(f.reference || "N/A", { bold: true, size: 18, color: NAVY })], { before: 0, after: 0 }),
            ],
            1400,
            { bg: shade },
          ),
          tc(
            [
              p([t("Confidence", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p(
                [
                  t((f.confidence || "N/A").toUpperCase(), {
                    bold: true,
                    size: 18,
                    color: f.confidence === "high" ? GREEN : f.confidence === "medium" ? ORANGE : MGRAY,
                  }),
                ],
                { before: 0, after: 0 },
              ),
            ],
            1400,
            { bg: shade },
          ),
          tc(
            [
              p([t("Result", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t(st.label, { bold: true, size: 18, color: st.text })], { before: 0, after: 0 }),
            ],
            2760,
            { bg: shade },
          ),
        ]),
        // Row 2: procedure (full, no truncation) | sign-off
        tr([
          tc(
            [
              p([t("Procedure Performed", { size: 14, color: MGRAY })], { before: 0, after: 30 }),
              // f.detail is the full text — no slicing
              p([t(f.detail ?? "", { size: 18 })], { before: 0, after: 0 }),
            ],
            7200,
            { bg: WHITE, span: 3 },
          ),
          tc(
            [
              p([t("Auditor Sign-Off", { size: 14, color: MGRAY })], { before: 0, after: 40 }),
              p([t("Initials: ________", { size: 17, color: MGRAY })], { before: 0, after: 30 }),
              p([t("Date:        ________", { size: 17, color: MGRAY })], { before: 0, after: 0 }),
            ],
            2160,
            { bg: WHITE },
          ),
        ]),
        // Row 3: conclusion — full text
        tr([
          tc(
            [
              p(
                [
                  t("Conclusion:  ", { size: 15, bold: true, color: MGRAY }),
                  t(conclusionText, { size: 18, italic: !f.reviewAction }),
                ],
                { before: 0, after: 0 },
              ),
            ],
            9360,
            { bg: st.bg, span: 4 },
          ),
        ]),
      ],
    }),
    gap(80),
  ];
}

function priorityColor(p: string): string {
  if (p === "HIGH") return RED;
  if (p === "MEDIUM") return ORANGE;
  return MGRAY;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper DOCX — full document (no text truncation anywhere)
// ─────────────────────────────────────────────────────────────────────────────

async function buildWorkpaperDocx(content: string, fileBaseName: string) {
  const raw = content.replace("__WORKPAPER_JSON__", "");
  const wp = JSON.parse(raw);
  const { meta, opinion, partAFindings, partBFindings, deterministicBlock, contraventions, rfis } = wp;

  const opC = opinionColorDocx(opinion.overall ?? "");
  const children: any[] = [];

  // ── COVER ──────────────────────────────────────────────────────────────────
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
                { before: 0, after: 80 },
                AlignmentType.CENTER,
              ),
              p([t(meta.fundName, { size: 28, color: "B8D4E8" })], { before: 0, after: 60 }, AlignmentType.CENTER),
              p(
                [t(`Year ended 30 June ${meta.financialYear}`, { size: 20, color: "8BADC4" })],
                { before: 0, after: 0 },
                AlignmentType.CENTER,
              ),
            ],
            9360,
            { bord: NB(), bg: NAVY, m: { top: 280, bottom: 280, left: 300, right: 300 } },
          ),
        ]),
      ],
    }),
  );
  children.push(gap(200));

  // Cover details — Fund | Opinion (full reasoning, no slice)
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        tr([
          tc(
            [
              p([t("Fund Details", { bold: true, size: 19, color: NAVY })], { before: 0, after: 100 }),
              p([t("ABN:  ", { bold: true, size: 18 }), t(meta.fundABN, { size: 18 })], { before: 0, after: 40 }),
              p(
                [
                  t("Financial Year:  ", { bold: true, size: 18 }),
                  t(`Year ended 30 June ${meta.financialYear}`, { size: 18 }),
                ],
                { before: 0, after: 40 },
              ),
              p([t("Prepared:  ", { bold: true, size: 18 }), t(meta.preparedDate, { size: 18 })], {
                before: 0,
                after: 40,
              }),
              p([t("Audit Standard:  ", { bold: true, size: 18 }), t("ASAE 3100 / SISA / SISR", { size: 18 })], {
                before: 0,
                after: 0,
              }),
            ],
            4680,
            { bg: BLUEBG },
          ),
          tc(
            [
              p([t("Audit Opinion Summary", { bold: true, size: 19, color: NAVY })], { before: 0, after: 100 }),
              p(
                [
                  t("Overall:  ", { bold: true, size: 18 }),
                  t(opinion.overall.toUpperCase(), { bold: true, size: 18, color: opC.text }),
                ],
                { before: 0, after: 80 },
              ),
              // Full reasoning — no .slice(0, 300)
              p([t(opinion.reasoning || "Opinion pending.", { size: 17, italic: true, color: MGRAY })], {
                before: 0,
                after: 0,
              }),
            ],
            4680,
            { bg: opC.bg, bord: B(opC.text) },
          ),
        ]),
      ],
    }),
  );

  // ── PART A ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("A", "Part A — Financial Audit Working Papers"));
  children.push(gap(140));
  children.push(
    p(
      [
        t("Objective:", { bold: true, size: 17 }),
        t(
          "  Obtain sufficient appropriate audit evidence to support the opinion on the financial statements (ASAE 3100, ASA 500).",
          { size: 17, italic: true, color: MGRAY },
        ),
      ],
      { before: 0, after: 120 },
    ),
  );
  if (!partAFindings.length) {
    children.push(
      p([t("No Part A findings recorded.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }),
    );
  } else {
    for (let i = 0; i < partAFindings.length; i++) {
      children.push(...findingBlock(partAFindings[i], i));
    }
  }

  // ── PART B ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("B", "Part B — Compliance Engagement Working Papers"));
  children.push(gap(140));
  children.push(
    p(
      [
        t("Objective:", { bold: true, size: 17 }),
        t("  Assess compliance with the provisions of the SISA and SISR specified in NAT 11466 (ASAE 3100, GS 009).", {
          size: 17,
          italic: true,
          color: MGRAY,
        }),
      ],
      { before: 0, after: 120 },
    ),
  );
  if (!partBFindings.length) {
    children.push(
      p([t("No Part B findings recorded.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }),
    );
  } else {
    for (let i = 0; i < partBFindings.length; i++) {
      children.push(...findingBlock(partBFindings[i], i));
    }
  }

  // ── SECTION C — Deterministic ──────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("C", "Deterministic Checks — Code Verified"));
  children.push(gap(120));
  children.push(
    p(
      [
        t(
          "The following results were computed arithmetically and are authoritative. Do not override with AI assessment.",
          { size: 17, italic: true, color: MGRAY },
        ),
      ],
      { before: 0, after: 120 },
    ),
  );
  for (const line of deterministicBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(gap(40));
      continue;
    }
    const isBold = /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed);
    children.push(
      p(
        [
          t(trimmed, {
            size: 18,
            bold: isBold,
            color: /BREACH|FAIL/.test(trimmed) ? RED : DGRAY,
          }),
        ],
        { before: 0, after: 40 },
      ),
    );
  }

  // ── SECTION D — Contraventions ─────────────────────────────────────────────
  children.push(gap(160));
  children.push(sectionDiv("D", "Contraventions Register"));
  children.push(gap(120));
  if (!contraventions.length) {
    children.push(
      p([t("No contraventions identified.", { size: 18, italic: true, color: GREEN })], { before: 0, after: 0 }),
    );
  } else {
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [400, 1400, 1600, 1200, 4760],
        rows: [
          tr(
            (
              [
                ["#", 400],
                ["SIS Section", 1400],
                ["Area", 1600],
                ["Severity", 1200],
                ["Details", 4760],
              ] as [string, number][]
            ).map(([h, w]) =>
              tc(p([t(h, { bold: true, size: 17, color: WHITE })]), w, {
                bord: B(NAVY),
                bg: NAVY,
                m: { top: 60, bottom: 60, left: 100, right: 60 },
              }),
            ),
          ),
          ...contraventions.map((c: any, i: number) => {
            const bg = i % 2 === 0 ? WHITE : LGRAY;
            const sevColor = c.severity === "material" ? RED : ORANGE;
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(c.section, { size: 17, bold: true, color: NAVY })]), 1400, { bg }),
              tc(p([t(c.area, { size: 17 })]), 1600, { bg }),
              tc(p([t(c.severity.toUpperCase(), { bold: true, size: 17, color: sevColor })]), 1200, { bg }),
              tc(p([t(c.description, { size: 17 })]), 4760, { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── SECTION E — RFIs ───────────────────────────────────────────────────────
  children.push(gap(160));
  children.push(sectionDiv("E", "Requests for Information (RFIs)"));
  children.push(gap(120));
  if (!rfis.length) {
    children.push(p([t("No RFIs raised.", { size: 18, italic: true, color: GREEN })], { before: 0, after: 0 }));
  } else {
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [400, 900, 4860, 1800, 1400],
        rows: [
          tr(
            (
              [
                ["#", 400],
                ["Priority", 900],
                ["Request", 4860],
                ["Title", 1800],
                ["Status", 1400],
              ] as [string, number][]
            ).map(([h, w]) =>
              tc(p([t(h, { bold: true, size: 17, color: WHITE })]), w, {
                bord: B(NAVY),
                bg: NAVY,
                m: { top: 60, bottom: 60, left: 100, right: 60 },
              }),
            ),
          ),
          ...rfis.map((r: any, i: number) => {
            const bg = i % 2 === 0 ? WHITE : LGRAY;
            const pc = priorityColor(r.priority);
            const stCol = r.status === "RESOLVED" ? GREEN : ORANGE;
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(r.priority, { bold: true, size: 17, color: pc })]), 900, { bg }),
              tc(p([t(r.description, { size: 17 })]), 4860, { bg }),
              tc(p([t(r.title, { bold: true, size: 17, color: NAVY })]), 1800, { bg }),
              tc(p([t(r.status, { bold: true, size: 17, color: stCol })]), 1400, { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── SECTION F — Opinion ────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("F", "Audit Opinion"));
  children.push(gap(140));
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        tr([
          tc(
            [
              p(
                [
                  t("Overall Opinion:  ", { bold: true, size: 21 }),
                  t(opinion.overall.toUpperCase(), { bold: true, size: 21, color: opC.text }),
                ],
                { before: 0, after: 100 },
              ),
              // Full reasoning — no truncation
              p([t(opinion.reasoning || "Opinion reasoning pending.", { size: 18 })], { before: 0, after: 0 }),
            ],
            9360,
            { bg: opC.bg, bord: B(opC.text) },
          ),
        ]),
      ],
    }),
  );

  // ── SECTION G — Sign-Off ───────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("G", "Auditor Sign-Off"));
  children.push(gap(140));
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        tr([
          tc(
            [
              p([t("Auditor Declaration", { bold: true, size: 19, color: NAVY })], { before: 0, after: 80 }),
              p([t("I confirm that I have:", { size: 18 })], { before: 0, after: 60 }),
              ...[
                "reviewed all working papers contained in this file",
                "obtained sufficient appropriate audit evidence",
                "conducted this audit in accordance with ASAE 3100",
                "complied with independence requirements under APES 110",
                "identified and assessed all contraventions as documented",
                "formed the opinion expressed in Section F",
              ].map(
                (item) =>
                  new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [t(item, { size: 18 })],
                    spacing: { before: 40, after: 40 },
                  }),
              ),
              gap(100),
              p([t("Name:  ___________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("SMSF Auditor Number:  ____________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Firm:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Date:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Signature:  _______________________________", { size: 18 })], { before: 0, after: 0 }),
            ],
            4680,
            { bg: BLUEBG },
          ),
          tc(
            [
              p([t("Retention Notice", { bold: true, size: 19, color: NAVY })], { before: 0, after: 80 }),
              p(
                [
                  t(
                    "These working papers must be retained for a minimum of 7 years from the date of signing, in accordance with ASIC requirements and ASA 230.",
                    { size: 17, italic: true, color: MGRAY },
                  ),
                ],
                { before: 0, after: 80 },
              ),
              p(
                [
                  t(
                    "An experienced auditor with no prior connection to this engagement should be able to understand, from these working papers alone, the nature, timing and extent of the audit procedures performed, the audit evidence obtained and the conclusions reached.",
                    { size: 17, color: MGRAY },
                  ),
                ],
                { before: 0, after: 0 },
              ),
            ],
            4680,
            { bg: LGRAY },
          ),
        ]),
      ],
    }),
  );

  // ── BUILD ──────────────────────────────────────────────────────────────────
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
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 9360, type: WidthType.DXA },
                columnWidths: [6500, 2860],
                rows: [
                  tr([
                    tc(
                      [
                        p([t("Audit Working Papers", { bold: true, size: 18, color: NAVY })], { before: 0, after: 20 }),
                        p(
                          [
                            t(`${meta.fundName}  |  ABN ${meta.fundABN}  |  Year ended 30 June ${meta.financialYear}`, {
                              size: 15,
                              color: MGRAY,
                            }),
                          ],
                          { before: 0, after: 0 },
                        ),
                      ],
                      6500,
                      { bord: NB() },
                    ),
                    tc(
                      [
                        p(
                          [t("CONFIDENTIAL", { bold: true, size: 14, color: RED })],
                          { before: 0, after: 0 },
                          AlignmentType.RIGHT,
                        ),
                      ],
                      2860,
                      { bord: NB(), va: VerticalAlign.CENTER },
                    ),
                  ]),
                ],
              }),
              hRule(NAVY, 8),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              hRule(BORD, 4),
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                children: [
                  t(`${meta.fundName} — Audit Working Papers FY${meta.financialYear}`, { size: 14, color: MGRAY }),
                  new TextRun({ text: "\t", size: 14 }),
                  t("Prepared by registered SMSF auditor", { size: 14, color: MGRAY }),
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
// Generic DOCX — plain reports (IAR, management letter, etc.)
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
