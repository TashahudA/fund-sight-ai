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
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";

// ─────────────────────────────────────────────────────────────────────────────
// Shared colour palette
// ─────────────────────────────────────────────────────────────────────────────

// PDF colours [R,G,B]
const PDF_BLACK: [number, number, number] = [0, 0, 0];
const PDF_NAVY: [number, number, number] = [31, 52, 88];
const PDF_DGRAY: [number, number, number] = [51, 51, 51];
const PDF_MGRAY: [number, number, number] = [120, 120, 120];
const PDF_LGRAY: [number, number, number] = [240, 240, 240];
const PDF_WHITE: [number, number, number] = [255, 255, 255];
const PDF_BORDER: [number, number, number] = [180, 180, 180];

// DOCX colours (hex)
const NAVY = "1F3458";
const DGRAY = "333333";
const MGRAY = "787878";
const LGRAY = "F0F0F0";
const WHITE = "FFFFFF";
const BORDER = "B4B4B4";
// Alias retained so untouched generic DOCX builder keeps compiling.
const BORD = BORDER;

// ─────────────────────────────────────────────────────────────────────────────
// Status / risk helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusColorDocx(status: string): { text: string; label: string; bg: string } {
  const s = (status ?? "").toLowerCase();
  const label =
    s === "pass"             ? "PASS"     :
    s === "fail"             ? "FAIL"     :
    s === "needs_info"       ? "INFO REQ" :
    s === "pass_with_review" ? "REVIEW"   :
    s === "refer_to_auditor" ? "REFER"    : "N/A";
  return { text: DGRAY, label, bg: WHITE };
}

function statusColorPdf(status: string): {
  text: [number, number, number];
  label: string;
  bg: [number, number, number];
} {
  const s = (status ?? "").toLowerCase();
  const label =
    s === "pass"             ? "PASS"     :
    s === "fail"             ? "FAIL"     :
    s === "needs_info"       ? "INFO REQ" :
    s === "pass_with_review" ? "REVIEW"   :
    s === "refer_to_auditor" ? "REFER"    : "N/A";
  return { text: PDF_DGRAY, label, bg: PDF_WHITE };
}

function riskColorDocx(_risk: string): { text: string; bg: string } {
  return { text: DGRAY, bg: WHITE };
}

function riskColorPdf(_risk: string): { text: [number, number, number]; bg: [number, number, number] } {
  return { text: PDF_DGRAY, bg: PDF_WHITE };
}

function opinionColorDocx(_o: string): { text: string; bg: string } {
  return { text: NAVY, bg: LGRAY };
}

function opinionColorPdf(_o: string): { text: [number, number, number]; bg: [number, number, number] } {
  return { text: PDF_NAVY, bg: PDF_LGRAY };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF entry points
// ─────────────────────────────────────────────────────────────────────────────

export function generateReportPdf(content: string, fundName: string, financialYear: string, fileBaseName: string) {
  if (content.startsWith("__WORKPAPER_JSON__")) {
    buildWorkpaperPdf(content, fundName, financialYear, fileBaseName);
  } else {
    buildGenericPdf(content, fundName, fileBaseName);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper PDF
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
  // V2 payload (__type: "WORKPAPER_JSON_V2") adds wp.materiality. Absent on V1 — handled gracefully.
  const materiality = wp.materiality ?? null;

  const fund = meta.fundName || fundName;
  const year = meta.financialYear || financialYear;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;
  const FOOT = 16;

  let y = ML;
  const san = (s: any) => String(s ?? "").replace(/[^\x00-\x7E]/g, "");

  const addPageFooter = () => {
    const pg = doc.getCurrentPageInfo().pageNumber;
    const fy = PH - 8;
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, fy - 4, PW - MR, fy - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_MGRAY);
    doc.text(san(fund), ML, fy);
  };

  const need = (h: number) => {
    if (y + h > PH - FOOT) {
      addPageFooter();
      doc.addPage();
      y = ML;
    }
    (doc as any).__lastY = y;
  };

  const sectionDiv = (label: string, title: string) => {
    need(10);
    // Thin navy horizontal rule
    doc.setDrawColor(...PDF_NAVY);
    doc.setLineWidth(0.3);
    doc.line(ML, y, ML + CW, y);
    y += 4;
    // Letter (bold 9pt navy) + title (bold 10pt dark grey) on one line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_NAVY);
    doc.text(san(label), ML, y);
    const labelW = doc.getTextWidth(san(label));
    doc.setFontSize(10);
    doc.setTextColor(...PDF_DGRAY);
    doc.text(san(title), ML + labelW + 3, y);
    y += 3;
    (doc as any).__lastY = y;
  };

  const gap = (mm = 4) => {
    y += mm;
    (doc as any).__lastY = y;
  };

  // ── bullet list helper ────────────────────────────────────────────────────
  const bulletList = (items: string[], labelColor: [number, number, number], itemColor: [number, number, number]) => {
    if (!items?.length) return;
    for (const item of items) {
      const lines = doc.splitTextToSize(san(item), CW - 8);
      for (let li = 0; li < lines.length; li++) {
        need(4.5);
        if (li === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...labelColor);
          doc.text("-", ML + 2, y);
        }
        doc.setTextColor(...itemColor);
        doc.text(lines[li], ML + 6, y);
        y += 4.2;
      }
    }
    (doc as any).__lastY = y;
  };

  // ── section label bar ─────────────────────────────────────────────────────
  // Bold dark-grey label followed by a thin light-grey rule. No fill.
  // Signature kept stable so call sites don't change; bg/text args ignored.
  const labelBar = (
    label: string,
    _bgColor: [number, number, number],
    _textColor: [number, number, number] = PDF_WHITE,
  ) => {
    need(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_DGRAY);
    doc.text(san(label).toUpperCase(), ML, y + 3.5);
    y += 4.5;
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.15);
    doc.line(ML, y, ML + CW, y);
    y += 1.5;
    (doc as any).__lastY = y;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COVER
  // ─────────────────────────────────────────────────────────────────────────
  // Top navy rule (1mm thick)
  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, 12, PW, 1, "F");

  // Title block, left-aligned
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_NAVY);
  doc.text("AUDIT WORKING PAPERS", ML, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_DGRAY);
  doc.text(san(fund), ML, 40);

  doc.setFontSize(10);
  doc.setTextColor(...PDF_MGRAY);
  doc.text(`Year ended 30 June ${san(year)}`, ML, 45);

  let coverBottom = 45;
  if (meta.fundABN) {
    doc.setFontSize(9);
    doc.text(`ABN ${san(meta.fundABN)}`, ML, 49);
    coverBottom = 49;
  }

  // Bottom navy rule
  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, coverBottom + 3, PW, 1, "F");

  y = coverBottom + 10;

  // Cover 2-col: Fund Details | Opinion Summary
  const halfW = CW / 2 - 2;
  const boxTop = y;
  const opC = opinionColorPdf(opinion.overall ?? "");
  const fundRows = [
    { label: "ABN:", value: san(meta.fundABN ?? "N/A") },
    { label: "Financial Year:", value: `Year ended 30 June ${san(year)}` },
    { label: "Prepared:", value: san(meta.preparedDate ?? "N/A") },
    { label: "Standard:", value: san(meta.standard ?? "ASA 230 / GS 009 / ASAE 3100") },
  ];
  const boxH = 8 + fundRows.length * 5.5 + 4;

  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, boxTop, halfW, boxH);

  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH);

  let bx = ML + 2;
  let by = boxTop + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Fund Details", bx, by);
  by += 5;
  for (const fr of fundRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_DGRAY);
    doc.text(fr.label, bx, by);
    doc.setFont("helvetica", "normal");
    doc.text(fr.value, bx + 30, by);
    by += 5.2;
  }

  bx = ML + halfW + 6;
  by = boxTop + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Audit Opinion Summary", bx, by);
  by += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...opC.text);
  doc.text(`Overall: ${(opinion.overall ?? "PENDING").toUpperCase()}`, bx, by);
  by += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_MGRAY);
  const reasonSnippet = doc.splitTextToSize(san(opinion.reasoning ?? ""), halfW - 6);
  for (const rl of reasonSnippet) {
    if (by > boxTop + boxH - 1) break;
    doc.text(rl, bx, by);
    by += 3.8;
  }
  y = boxTop + boxH + 6;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION M — Materiality (V2 only; skipped if absent)
  // ─────────────────────────────────────────────────────────────────────────
  if (materiality) {
    addPageFooter();
    doc.addPage();
    y = ML;

    sectionDiv("M", "Materiality Determination (ASA 320 / GS 009)");
    gap(4);

    const matRows: Array<[string, string]> = [
      ["Benchmark", "Total assets (GS 009 — primary measure of SMSF fund size)"],
      [
        "Benchmark value",
        materiality.benchmark_value != null
          ? `$${Number(materiality.benchmark_value).toLocaleString()}`
          : "Per financial statements",
      ],
      ["Overall materiality (2%)", `$${Number(materiality.overall ?? 0).toLocaleString()}`],
      ["Performance materiality (75%)", `$${Number(materiality.performance ?? 0).toLocaleString()}`],
      ["Clearly trivial threshold (5%)", `$${Number(materiality.trivial ?? 0).toLocaleString()}`],
    ];
    const matBoxH = 6 + matRows.length * 6 + 4;
    need(matBoxH);
    doc.setFillColor(...PDF_LGRAY);
    doc.rect(ML, y, CW, matBoxH, "F");
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.rect(ML, y, CW, matBoxH);
    let myy = y + 6;
    for (const [lbl, val] of matRows) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_DGRAY);
      doc.text(san(lbl), ML + 3, myy);
      doc.setFont("helvetica", "normal");
      doc.text(san(val), ML + 70, myy);
      myy += 6;
    }
    y += matBoxH + 4;

    const trivialStr = `$${Number(materiality.trivial ?? 0).toLocaleString()}`;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MGRAY);
    const noteLines = doc.splitTextToSize(
      `Differences below ${trivialStr} will not be reported unless indicative of fraud or systematic error. (ASA 450)`,
      CW,
    );
    for (const l of noteLines) {
      need(4);
      doc.text(l, ML, y);
      y += 4;
    }
    gap(2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART A
  // ─────────────────────────────────────────────────────────────────────────
  addPageFooter();
  doc.addPage();
  y = ML;

  sectionDiv("A", "Part A — Financial Audit Working Papers  (ASA 330 / GS 009 Part A)");
  gap(3);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  const objA = doc.splitTextToSize(
    "Objective: Obtain sufficient appropriate audit evidence to form an opinion on the financial report (ASA 500). " +
      "For each area, procedures must be specific enough that an experienced auditor with no prior connection " +
      "to this engagement can understand what was done, the evidence obtained, and the conclusion reached (ASA 230 para 8).",
    CW,
  );
  for (const l of objA) {
    need(4);
    doc.text(l, ML, y);
    y += 4;
  }
  gap(3);

  if (!partAFindings.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No Part A findings recorded.", ML, y);
    y += 5;
  } else {
    for (let i = 0; i < partAFindings.length; i++) {
      y = renderFindingPdf(doc, partAFindings[i], i, y, ML, CW, PH, FOOT, san, gap, need, labelBar, bulletList);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART B
  // ─────────────────────────────────────────────────────────────────────────
  addPageFooter();
  doc.addPage();
  y = ML;

  sectionDiv("B", "Part B — Compliance Engagement Working Papers  (ASAE 3100 / GS 009 Part B)");
  gap(3);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  const objB = doc.splitTextToSize(
    "Objective: Obtain sufficient appropriate evidence to conclude on compliance with SISA/SISR provisions " +
      "specified in NAT 11466. Each area documents the specific provision tested, procedures performed, " +
      "evidence obtained, any deviations, and the auditor's conclusion.",
    CW,
  );
  for (const l of objB) {
    need(4);
    doc.text(l, ML, y);
    y += 4;
  }
  gap(3);

  if (!partBFindings.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No Part B findings recorded.", ML, y);
    y += 5;
  } else {
    for (let i = 0; i < partBFindings.length; i++) {
      y = renderFindingPdf(doc, partBFindings[i], i, y, ML, CW, PH, FOOT, san, gap, need, labelBar, bulletList);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION C — Deterministic Checks
  // ─────────────────────────────────────────────────────────────────────────
  addPageFooter();
  doc.addPage();
  y = ML;

  sectionDiv("C", "Deterministic Checks — Code Verified");
  gap(3);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Results computed arithmetically. Do not override with AI assessment.", ML, y);
  y += 5;
  gap(2);

  for (const line of deterministicBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      gap(2);
      continue;
    }
    const isBold = /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed);
    const lns = doc.splitTextToSize(san(trimmed), CW);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_DGRAY);
    for (const l of lns) {
      need(4.5);
      doc.text(l, ML, y);
      y += 4.2;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION D — Contraventions
  // ─────────────────────────────────────────────────────────────────────────
  gap(6);
  sectionDiv("D", "Contraventions Register  (s129/s130 SISA)");
  gap(3);

  // Section D: contraventions[] is the single source of truth.
  // Railway guarantees this array is populated whenever opinion_part_b is qualified.
  // "No contraventions identified." is only shown when the array is genuinely empty.
  if (!contraventions.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No contraventions identified.", ML, y);
    y += 5;
  } else {
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
      y = drawTableRow(
        doc,
        ML,
        CW,
        y,
        dCols,
        [
          { text: String(i + 1), bold: true },
          { text: san(c.section), bold: true },
          { text: san(c.area) },
          { text: (c.severity ?? "").toUpperCase(), bold: true },
          { text: san(c.description) },
        ],
        i % 2 === 0 ? PDF_WHITE : PDF_LGRAY,
        PH,
        FOOT,
      );
    });
    gap(4);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION E — RFIs
  // ─────────────────────────────────────────────────────────────────────────
  gap(6);
  sectionDiv("E", "Requests for Information (RFIs)");
  gap(3);

  if (!rfis.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No RFIs raised.", ML, y);
    y += 5;
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
      y = drawTableRow(
        doc,
        ML,
        CW,
        y,
        eCols,
        [
          { text: String(i + 1), bold: true },
          { text: san(r.priority), bold: true },
          { text: san(r.description) },
          { text: san(r.title), bold: true },
          { text: san(r.status), bold: true },
        ],
        i % 2 === 0 ? PDF_WHITE : PDF_LGRAY,
        PH,
        FOOT,
      );
    });
    gap(4);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION F — Opinion
  // ─────────────────────────────────────────────────────────────────────────
  addPageFooter();
  doc.addPage();
  y = ML;

  sectionDiv("F", "Audit Opinion  (NAT 11466 / ASAE 3100)");
  gap(4);

  const opLabel = (opinion.overall ?? "PENDING").toUpperCase();
  const reasonLines = doc.splitTextToSize(san(opinion.reasoning ?? "Opinion reasoning pending."), CW - 6);
  const opBoxH = 16 + reasonLines.length * 4.5;
  need(opBoxH);

  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML, y, CW, opBoxH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, CW, opBoxH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PDF_NAVY);
  doc.text(`Overall Opinion:  ${opLabel}`, ML + 3, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  let oy = y + 15;
  for (const rl of reasonLines) {
    doc.text(rl, ML + 3, oy);
    oy += 4.5;
  }
  y = oy + 4;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION G — Sign-Off
  // ─────────────────────────────────────────────────────────────────────────
  addPageFooter();
  doc.addPage();
  y = ML;

  sectionDiv("G", "Auditor Sign-Off  (ASA 230 / APES 110)");
  gap(4);

  const checklist = [
    "reviewed all working papers contained in this file",
    "obtained sufficient appropriate audit evidence for each area documented",
    "conducted this audit in accordance with ASAE 3100 and ASA 200-899",
    "complied with independence requirements under APES 110",
    "identified and assessed all contraventions per ACR criteria (s129/s130)",
    "formed the opinion expressed in Section F",
  ];
  const signRows = ["Name:", "SMSF Auditor Number (SAN):", "Firm:", "Date:", "Signature:"];
  const leftW = CW / 2 - 2;
  const rightW = CW / 2 - 2;
  const retLine1 = doc.splitTextToSize(
    "Working papers must be retained for a minimum of 7 years from the date of signing (ASA 230, ASIC requirements).",
    rightW - 6,
  );
  const retLine2 = doc.splitTextToSize(
    "An experienced auditor with no prior connection to this engagement should be able to understand, from these working papers alone, " +
      "the nature, timing and extent of audit procedures performed, evidence obtained, and conclusions reached (ASA 230 para 8).",
    rightW - 6,
  );
  const leftH = 10 + checklist.length * 5 + 30 + signRows.length * 7 + 10;
  const rightH = 10 + retLine1.length * 4.2 + 6 + retLine2.length * 4.2 + 6;
  const soH = Math.max(leftH, rightH);
  need(soH);

  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML, y, leftW, soH, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, leftW, soH);
  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML + leftW + 4, y, rightW, soH, "F");
  doc.rect(ML + leftW + 4, y, rightW, soH);

  let lx = ML + 3,
    ly = y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Auditor Declaration", lx, ly);
  ly += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  doc.text("I confirm that I have:", lx, ly);
  ly += 5;
  for (const item of checklist) {
    doc.text(`-  ${san(item)}`, lx + 3, ly);
    ly += 4.8;
  }
  ly += 3;
  // Independence statement (APES 110)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  const indepLines = doc.splitTextToSize(
    "Independence: The auditor confirms that, to the best of their knowledge and belief, the engagement team has complied with the independence requirements of APES 110 Code of Ethics for Professional Accountants throughout the conduct of this engagement. No relationships, interests, or circumstances have been identified that would compromise independence in accordance with APES 110.",
    leftW - 6,
  );
  for (const l of indepLines) {
    doc.text(l, lx, ly);
    ly += 4;
  }
  ly += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  for (const row of signRows) {
    doc.text(row, lx, ly);
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.25);
    doc.line(lx + 45, ly + 1, ML + leftW - 3, ly + 1);
    ly += 7;
  }

  let rx = ML + leftW + 7,
    ry = y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text("Retention Notice", rx, ry);
  ry += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  for (const l of retLine1) {
    doc.text(l, rx, ry);
    ry += 4.2;
  }
  ry += 3;
  doc.setFont("helvetica", "normal");
  for (const l of retLine2) {
    doc.text(l, rx, ry);
    ry += 4.2;
  }

  // ── Page numbers on all pages ─────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg);
    const fy2 = PH - 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_MGRAY);
    doc.text(`Page ${pg} of ${pageCount}`, PW - MR, fy2, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ASA 230 Finding renderer — PDF
// Six sections: Assertions | Risk | Procedures | Evidence | Exceptions | Conclusion
// ─────────────────────────────────────────────────────────────────────────────

function renderFindingPdf(
  doc: jsPDF,
  f: any,
  idx: number,
  y: number,
  ML: number,
  CW: number,
  PH: number,
  FOOT: number,
  san: (s: any) => string,
  pdfGap: (mm?: number) => void,
  need: (h: number) => void,
  labelBar: (label: string, bg: [number, number, number], text?: [number, number, number]) => void,
  bulletList: (items: string[], lc: [number, number, number], ic: [number, number, number]) => void,
): number {
  const st = statusColorPdf(f.status);
  const rc = riskColorPdf(f.risk_level || "MEDIUM");

  // ── Header row ─────────────────────────────────────────────────────────────
  need(14);
  // Working paper reference number
  const wpRef = `WP-${idx + 1 < 10 ? "0" : ""}${idx + 1}`;

  let ly: number = (doc as any).__lastY ?? y;

  // No background fill, no bounding box. Plain text header with thin underline.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_DGRAY);
  doc.text(san(f.area), ML, ly + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MGRAY);
  doc.text(wpRef, ML, ly + 10);

  // Evidence Source (V2 field; "—" fallback)
  const evX = ML + CW * 0.34;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Evidence Source", evX, ly + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_DGRAY);
  const evSrc = san(f.evidence_source ?? "") || "—";
  const evLines = doc.splitTextToSize(evSrc, CW * 0.18 - 2);
  doc.text(evLines[0] ?? "—", evX, ly + 9.5);

  // SIS reference
  const refX = ML + CW * 0.52;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("SIS / Std Reference", refX, ly + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_DGRAY);
  doc.text(san(f.reference || "N/A"), refX, ly + 9.5);

  // Risk level
  const riskX = ML + CW * 0.7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Inherent Risk (ASA 315)", riskX, ly + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...rc.text);
  doc.text((f.risk_level || "MEDIUM").toUpperCase(), riskX, ly + 9.5);

  // Status
  const resX = ML + CW * 0.88;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("Result", resX, ly + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...st.text);
  doc.text(st.label, resX, ly + 9.5);

  ly += 12;
  // Single thin underline beneath the header
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, ly, ML + CW, ly);
  ly += 2;
  (doc as any).__lastY = ly;

  // ── Section 1: Assertions ─────────────────────────────────────────────────
  labelBar("1. ASSERTIONS TESTED (ASA 315)", PDF_NAVY);
  ly = (doc as any).__lastY ?? ly;
  if (f.assertions?.length) {
    bulletList(f.assertions, PDF_MGRAY, PDF_DGRAY);
    ly = (doc as any).__lastY ?? ly;
  } else {
    need(4.5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No assertions documented.", ML + 3, ly);
    ly += 4.5;
    (doc as any).__lastY = ly;
  }

  // ── Section 2: Procedures ─────────────────────────────────────────────────
  if (f.procedures?.length) {
    labelBar("2. PROCEDURES PERFORMED (ASA 330)", PDF_NAVY);
    ly = (doc as any).__lastY ?? ly;
    bulletList(f.procedures, PDF_MGRAY, PDF_DGRAY);
    ly = (doc as any).__lastY ?? ly;
  } else {
    labelBar("2. PROCEDURES PERFORMED (ASA 330)", PDF_NAVY);
    ly = (doc as any).__lastY ?? ly;
    need(4.5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("To be completed by auditor.", ML + 3, ly);
    ly += 4.5;
    (doc as any).__lastY = ly;
  }

  // ── Section 3: Evidence obtained ─────────────────────────────────────────
  if (f.evidence?.length) {
    labelBar("3. EVIDENCE OBTAINED (ASA 500)", PDF_NAVY);
    ly = (doc as any).__lastY ?? ly;
    bulletList(f.evidence, PDF_MGRAY, PDF_DGRAY);
    ly = (doc as any).__lastY ?? ly;
  } else {
    labelBar("3. EVIDENCE OBTAINED (ASA 500)", PDF_NAVY);
    ly = (doc as any).__lastY ?? ly;
    need(4.5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("To be completed by auditor.", ML + 3, ly);
    ly += 4.5;
    (doc as any).__lastY = ly;
  }

  // ── Section 4: Exceptions ────────────────────────────────────────────────
  labelBar("4. EXCEPTIONS / DEVIATIONS (ASA 230 para 16)", PDF_NAVY);
  ly = (doc as any).__lastY ?? ly;
  if (f.exceptions?.length) {
    bulletList(f.exceptions, PDF_MGRAY, PDF_DGRAY);
    ly = (doc as any).__lastY ?? ly;
  } else {
    need(4.5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MGRAY);
    doc.text("No exceptions noted.", ML + 3, ly);
    ly += 4.5;
    (doc as any).__lastY = ly;
  }

  // ── Section 5: Conclusion ─────────────────────────────────────────────────
  const conclusionText = f.reviewAction
    ? `${f.reviewAction.toUpperCase()}${f.reviewNote ? " — " + f.reviewNote : ""}`
    : f.conclusion || "Pending auditor review.";

  const concLines = doc.splitTextToSize(san(conclusionText), CW - 6);
  const concH = concLines.length * 4.2 + 10;
  need(concH + 6);
  ly = (doc as any).__lastY ?? ly;

  // Light grey background, navy accent strip on the left edge.
  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML, ly, CW, concH, "F");
  doc.setFillColor(...PDF_NAVY);
  doc.rect(ML, ly, 1, concH, "F");
  const concY0 = ly;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_MGRAY);
  doc.text("5. AUDITOR CONCLUSION (ASA 230)", ML + 4, concY0 + 4);
  doc.setFont("helvetica", !f.reviewAction ? "italic" : "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  let cy = concY0 + 9;
  for (const cl of concLines) {
    doc.text(cl, ML + 4, cy);
    cy += 4.2;
  }

  // ── Sign-off row ──────────────────────────────────────────────────────────
  const soH2 = 10;
  need(soH2);
  const soY = cy + 1;
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.15);
  doc.line(ML, soY, ML + CW, soY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_MGRAY);
  if (f.reviewedBy || f.reviewedAt) {
    doc.text(
      `Reviewed by: ${san(f.reviewedBy || "___________")}   Date: ${san(f.reviewedAt || "__________")}   Initials: _______`,
      ML + 2,
      soY + 5,
    );
  } else {
    doc.text("Reviewed by: ___________   Date: __________   Initials: _______", ML + 2, soY + 5);
  }

  ly = soY + soH2 + 3;
  (doc as any).__lastY = ly;
  return ly;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF table helpers
// ─────────────────────────────────────────────────────────────────────────────

type ColDef = { label: string; w: number };

function drawTableHeader(doc: jsPDF, ML: number, CW: number, y: number, cols: ColDef[]) {
  doc.setFillColor(...PDF_LGRAY);
  doc.rect(ML, y, CW, 6, "F");
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.15);
  doc.rect(ML, y, CW, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_DGRAY);
  let cx = ML + 1;
  for (const col of cols) {
    doc.text(col.label, cx, y + 4.2);
    cx += col.w * CW;
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
  const wrapped = cells.map((cell, i) => {
    doc.setFont("helvetica", cell.bold ? "bold" : "normal");
    doc.setFontSize(8);
    return doc.splitTextToSize(cell.text, colWidths[i] - 3);
  });
  const maxLines = Math.max(...wrapped.map((w) => w.length));
  const rowH = maxLines * 4.2 + 4;

  if (y + rowH > PH - FOOT) {
    doc.addPage();
    y = ML;
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
    doc.setFont("helvetica", cells[i].bold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_DGRAY);
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
// Generic PDF
// ─────────────────────────────────────────────────────────────────────────────

function buildGenericPdf(content: string, fundName: string, fileBaseName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight() - margin * 2;
  let y = margin;

  for (const line of content.split("\n")) {
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
      for (const wl of doc.splitTextToSize(trimmed, pageW)) {
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
    for (const wl of doc.splitTextToSize(trimmed.replace(/[^\x00-\x7E]/g, ""), pageW)) {
      if (y > pageH + margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(wl, margin, y);
      y += 5;
    }
    y += 1;
  }

  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    const fy = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("times", "normal");
    doc.text(fundName, margin, fy);
    doc.text(`Page ${i} of ${pc}`, doc.internal.pageSize.getWidth() - margin, fy, { align: "right" });
  }
  doc.save(`${fileBaseName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX entry point
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
    font: "Arial",
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
  new Paragraph({
    children: [
      new TextRun({ text: label + "  ", bold: true, size: 20, color: NAVY, font: "Arial" }),
      new TextRun({ text: title, bold: true, size: 20, color: DGRAY, font: "Arial" }),
    ],
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
  });

// Sub-section label row — plain bold paragraph with thin bottom rule.
// Signature kept stable (bgHex/colWidth ignored) so call sites don't change.
const subLabelRow = (label: string, _bgHex: string, _colWidth = 9360) =>
  new Paragraph({
    children: [new TextRun({ text: label, bold: true, size: 16, color: DGRAY, font: "Arial" })],
    spacing: { before: 120, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 1 } },
  });

// Bullet list helper for DOCX
const bulletItems = (items: string[], color = DGRAY, size = 18): Paragraph[] => {
  if (!items?.length) return [];
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [t(item, { size, color })],
        spacing: { before: 40, after: 40 },
      }),
  );
};

const warningPara = (msg: string) => p([t(msg, { size: 17, italic: true, color: MGRAY })], { before: 60, after: 60 });

// ─────────────────────────────────────────────────────────────────────────────
// ASA 230 Finding block — DOCX
// Six sections: Assertions | Procedures | Evidence | Exceptions | Conclusion | Sign-off
// ─────────────────────────────────────────────────────────────────────────────

function findingBlock(f: any, idx: number): (Table | Paragraph)[] {
  const st = statusColorDocx(f.status);
  const rc = riskColorDocx(f.risk_level || "MEDIUM");
  const shade = idx % 2 === 0 ? WHITE : LGRAY;
  const wpRef = `WP-${idx + 1 < 10 ? "0" : ""}${idx + 1}`;

  const conclusionText = f.reviewAction
    ? `${f.reviewAction.toUpperCase()}${f.reviewNote ? " — " + f.reviewNote : ""}`
    : f.conclusion || "Pending auditor review.";

  return [
    // ── Header: area | reference | risk | result ────────────────────────────
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      // Five columns: area+wpRef | Evidence Source (V2) | SIS Ref | Risk | Result
      columnWidths: [2400, 1880, 1680, 1480, 1920],
      rows: [
        tr([
          tc(
            [
              p([t(f.area, { bold: true, size: 20, color: DGRAY })], { before: 0, after: 20 }),
              p([t(wpRef, { size: 15, color: MGRAY, italic: true })], { before: 0, after: 0 }),
            ],
            2400,
            { bg: WHITE, bord: { top: NB().top, left: NB().left, right: NB().right, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } } },
          ),
          tc(
            [
              p([t("Evidence Source", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t(String(f.evidence_source ?? "").trim() || "—", { bold: true, size: 18, color: DGRAY })], { before: 0, after: 0 }),
            ],
            1880,
            { bg: WHITE, bord: { top: NB().top, left: NB().left, right: NB().right, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } } },
          ),
          tc(
            [
              p([t("SIS / Std Reference", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t(f.reference || "N/A", { bold: true, size: 18, color: DGRAY })], { before: 0, after: 0 }),
            ],
            1680,
            { bg: WHITE, bord: { top: NB().top, left: NB().left, right: NB().right, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } } },
          ),
          tc(
            [
              p([t("Inherent Risk (ASA 315)", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t((f.risk_level || "MEDIUM").toUpperCase(), { bold: true, size: 18, color: rc.text })], {
                before: 0,
                after: 0,
              }),
            ],
            1480,
            { bg: WHITE, bord: { top: NB().top, left: NB().left, right: NB().right, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } } },
          ),
          tc(
            [
              p([t("Result", { size: 14, color: MGRAY })], { before: 0, after: 20 }),
              p([t(st.label, { bold: true, size: 18, color: st.text })], { before: 0, after: 0 }),
            ],
            1920,
            { bg: WHITE, bord: { top: NB().top, left: NB().left, right: NB().right, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } } },
          ),
        ]),
      ],
    }),

    // ── 1. Assertions ────────────────────────────────────────────────────────
    subLabelRow("1. ASSERTIONS TESTED (ASA 315)", NAVY),
    ...(f.assertions?.length ? bulletItems(f.assertions, DGRAY) : [warningPara("No assertions documented.")]),

    // ── 2. Procedures ────────────────────────────────────────────────────────
    subLabelRow("2. PROCEDURES PERFORMED (ASA 330)", "445C8A"),
    ...(f.procedures?.length
      ? bulletItems(f.procedures, DGRAY)
      : [warningPara("To be completed by auditor.")]),

    // ── 3. Evidence obtained ─────────────────────────────────────────────────
    subLabelRow("3. EVIDENCE OBTAINED (ASA 500)", "326B50"),
    ...(f.evidence?.length
      ? bulletItems(f.evidence, DGRAY)
      : [warningPara("To be completed by auditor.")]),

    // ── 4. Exceptions ────────────────────────────────────────────────────────
    subLabelRow("4. EXCEPTIONS / DEVIATIONS (ASA 230 para 16)", "96501E"),
    ...(f.exceptions?.length
      ? bulletItems(f.exceptions, DGRAY, 18)
      : [p([t("No exceptions noted.", { size: 18, italic: true, color: MGRAY })], { before: 60, after: 60 })]),

    // ── 5. Conclusion + sign-off ─────────────────────────────────────────────
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [7000, 2360],
      rows: [
        tr([
          tc(
            [
              p([t("5. AUDITOR CONCLUSION (ASA 230)", { size: 15, bold: true, color: MGRAY })], {
                before: 0,
                after: 30,
              }),
              p([t(conclusionText, { size: 18, italic: !f.reviewAction })], { before: 0, after: 0 }),
            ],
            7000,
            {
              bg: LGRAY,
              bord: {
                top: { style: BorderStyle.NONE, size: 0, color: WHITE },
                bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
                right: { style: BorderStyle.NONE, size: 0, color: WHITE },
                left: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
              },
            },
          ),
          tc(
            [
              p([t("Auditor Sign-Off", { size: 14, color: MGRAY })], { before: 0, after: 40 }),
              p([t(`Reviewed by: ${f.reviewedBy || "___________"}`, { size: 16 })], { before: 0, after: 30 }),
              p([t(`Date: ${f.reviewedAt || "__________"}`, { size: 16 })], { before: 0, after: 30 }),
              p([t("Initials: _______", { size: 16, color: MGRAY })], { before: 0, after: 0 }),
            ],
            2360,
            { bg: WHITE },
          ),
        ]),
      ],
    }),

    gap(100),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Workpaper DOCX builder
// ─────────────────────────────────────────────────────────────────────────────

async function buildWorkpaperDocx(content: string, fileBaseName: string) {
  const raw = content.replace("__WORKPAPER_JSON__", "");
  const wp = JSON.parse(raw);
  const { meta, opinion, partAFindings, partBFindings, deterministicBlock, contraventions, rfis } = wp;
  // V2 payload (__type: "WORKPAPER_JSON_V2") adds wp.materiality. Absent on V1 — handled gracefully.
  const materiality = wp.materiality ?? null;

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

  // Cover 2-col: fund details | opinion
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
              p(
                [
                  t("Standard:  ", { bold: true, size: 18 }),
                  t(meta.standard || "ASA 230 / GS 009 / ASAE 3100", { size: 18 }),
                ],
                { before: 0, after: 0 },
              ),
            ],
            4680,
            { bg: LGRAY },
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
              p([t(opinion.reasoning || "Opinion pending.", { size: 17, italic: true, color: MGRAY })], {
                before: 0,
                after: 0,
              }),
            ],
            4680,
            { bg: opC.bg, bord: B(BORDER) },
          ),
        ]),
      ],
    }),
  );

  // ── PART A ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  // ── SECTION M — Materiality (V2 only; skipped if absent) ──────────────────
  if (materiality) {
    children.push(sectionDiv("M", "Materiality Determination (ASA 320 / GS 009)"));
    children.push(gap(120));
    const matRows: Array<[string, string]> = [
      ["Benchmark", "Total assets (GS 009 — primary measure of SMSF fund size)"],
      [
        "Benchmark value",
        materiality.benchmark_value != null
          ? `$${Number(materiality.benchmark_value).toLocaleString()}`
          : "Per financial statements",
      ],
      ["Overall materiality (2%)", `$${Number(materiality.overall ?? 0).toLocaleString()}`],
      ["Performance materiality (75%)", `$${Number(materiality.performance ?? 0).toLocaleString()}`],
      ["Clearly trivial threshold (5%)", `$${Number(materiality.trivial ?? 0).toLocaleString()}`],
    ];
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3600, 5760],
        rows: matRows.map(([lbl, val]) =>
          tr([
            tc(p([t(lbl, { bold: true, size: 18 })], { before: 0, after: 0 }), 3600, { bg: LGRAY }),
            tc(p([t(val, { size: 18 })], { before: 0, after: 0 }), 5760, { bg: LGRAY }),
          ]),
        ),
      }),
    );
    const trivialStr = `$${Number(materiality.trivial ?? 0).toLocaleString()}`;
    children.push(
      p(
        [
          t(
            `Differences below ${trivialStr} will not be reported unless indicative of fraud or systematic error. (ASA 450)`,
            { size: 17, italic: true, color: MGRAY },
          ),
        ],
        { before: 100, after: 120 },
      ),
    );
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  children.push(sectionDiv("A", "Part A — Financial Audit Working Papers  (ASA 330 / GS 009 Part A)"));
  children.push(gap(120));
  children.push(
    p(
      [
        t("Objective: ", { bold: true, size: 17 }),
        t(
          "Obtain sufficient appropriate audit evidence to form an opinion on the financial report (ASA 500). " +
            "Each area documents assertions tested, procedures performed, evidence obtained, exceptions, and the auditor's conclusion " +
            "to satisfy the reperformance test under ASA 230 para 8.",
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
  children.push(sectionDiv("B", "Part B — Compliance Engagement Working Papers  (ASAE 3100 / GS 009 Part B)"));
  children.push(gap(120));
  children.push(
    p(
      [
        t("Objective: ", { bold: true, size: 17 }),
        t(
          "Obtain sufficient appropriate evidence to conclude on compliance with SISA/SISR provisions specified in NAT 11466. " +
            "Each area documents the specific provision tested, procedures, evidence, exceptions, and conclusion.",
          { size: 17, italic: true, color: MGRAY },
        ),
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
  children.push(gap(100));
  children.push(
    p(
      [
        t("Results computed arithmetically. Do not override with AI assessment.", {
          size: 17,
          italic: true,
          color: MGRAY,
        }),
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
            color: DGRAY,
          }),
        ],
        { before: 0, after: 40 },
      ),
    );
  }

  // ── SECTION D — Contraventions ─────────────────────────────────────────────
  children.push(gap(160));
  children.push(sectionDiv("D", "Contraventions Register  (s129/s130 SISA)"));
  children.push(gap(100));
  // Section D: contraventions[] is the single source of truth.
  // Railway guarantees this array is populated whenever opinion_part_b is qualified.
  // "No contraventions identified." is only shown when the array is genuinely empty.
  if (!contraventions.length) {
    children.push(
      p([t("No contraventions identified.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }),
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
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(c.section, { size: 17, bold: true, color: NAVY })]), 1400, { bg }),
              tc(p([t(c.area, { size: 17 })]), 1600, { bg }),
              tc(p([t(c.severity.toUpperCase(), { bold: true, size: 17, color: DGRAY })]), 1200, { bg }),
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
  children.push(gap(100));
  if (!rfis.length) {
    children.push(p([t("No RFIs raised.", { size: 18, italic: true, color: MGRAY })], { before: 0, after: 0 }));
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
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(r.priority, { bold: true, size: 17, color: DGRAY })]), 900, { bg }),
              tc(p([t(r.description, { size: 17 })]), 4860, { bg }),
              tc(p([t(r.title, { bold: true, size: 17, color: NAVY })]), 1800, { bg }),
              tc(p([t(r.status, { bold: true, size: 17, color: DGRAY })]), 1400, { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── SECTION F — Opinion ────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDiv("F", "Audit Opinion  (NAT 11466)"));
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
  children.push(sectionDiv("G", "Auditor Sign-Off  (ASA 230 / APES 110)"));
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
                "obtained sufficient appropriate audit evidence for each area documented",
                "conducted this audit in accordance with ASAE 3100 and ASA 200-899",
                "complied with independence requirements under APES 110",
                "identified and assessed all contraventions per ACR criteria (s129/s130)",
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
              p([t("SMSF Auditor Number (SAN):  ______________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Firm:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Date:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Signature:  _______________________________", { size: 18 })], { before: 0, after: 0 }),
            ],
            4680,
            { bg: LGRAY },
          ),
          tc(
            [
              p([t("Retention Notice  (ASA 230)", { bold: true, size: 19, color: NAVY })], { before: 0, after: 80 }),
              p(
                [
                  t(
                    "Working papers must be retained for a minimum of 7 years from the date of signing, " +
                      "in accordance with ASIC requirements and ASA 230.",
                    { size: 17, italic: true, color: MGRAY },
                  ),
                ],
                { before: 0, after: 80 },
              ),
              p(
                [
                  t(
                    "An experienced auditor with no prior connection to this engagement should be able to understand, " +
                      "from these working papers alone, the nature, timing and extent of audit procedures performed, " +
                      "evidence obtained, and conclusions reached (ASA 230 para 8).",
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

  // ── Build ──────────────────────────────────────────────────────────────────
  const docx = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20, color: DGRAY } } },
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
              new Paragraph({
                children: [
                  t(
                    `${meta.fundName}  |  ABN ${meta.fundABN}  |  Year ended 30 June ${meta.financialYear}`,
                    { size: 15, color: MGRAY },
                  ),
                ],
                spacing: { before: 0, after: 60 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
              }),
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
                  new TextRun({ text: "   Page ", size: 14, color: MGRAY }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, font: "Arial", color: MGRAY }),
                  new TextRun({ text: " of ", size: 14, color: MGRAY }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: "Arial", color: MGRAY }),
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
// Generic DOCX
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
          children: [new TextRun({ text: trimmed, bold: true, font: "Arial", size: 22, color: NAVY })],
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
      if (parsed.length) {
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
                                font: "Arial",
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
        children: [new TextRun({ text: raw, font: "Arial", size: 20, color: DGRAY })],
      }),
    );
    i++;
  }

  const docx = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20, color: DGRAY } } } },
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
